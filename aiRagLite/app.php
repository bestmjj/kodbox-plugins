<?php
/**
 * KodBox 1.70.03 compatible community RAG plugin (v0.4.0).
 * Admin-only read access. Notify reconciler after selected successful mutations.
 * No KodBox core/database modifications. Hooks do not cover external DAV writes.
 */
class aiRagLitePlugin extends PluginBase {
    private $lastResolveError = '';
    public function __construct(){ parent::__construct(); }

    public function regist(){
        $this->hookRegist(array(
            'user.commonJs.insert' => 'aiRagLitePlugin.echoJs',
            'globalRequest' => 'aiRagLitePlugin.registerMutationHook',
        ));
    }

    public function echoJs(){
        if (!KodUser::isRoot()) return;
        $this->echoFile('static/main.js');
    }

    // KodBox show_json hook fires after a successful controller action.
    // Constrain to known mutations to avoid extra requests on normal page views.
    public function registerMutationHook(){
        if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') return;
        if (!defined('MOD') || !defined('ST') || !defined('ACT')) return;
        $module = strtolower(MOD.'.'.ST);
        $action = strtolower(ACT);
        $allowed = array(
            'explorer.index' => array('mkfile','mkdir','unzip','pathrename','pathdelete','pathpast',
                                     'pathcopyto','pathcuteto','filesave','recyclerestore','filedownloadremove'),
            'explorer.editor' => array('filesave'),
            'explorer.upload' => array('fileupload','fileuploadbyclient'),
        );
        if (!isset($allowed[$module]) || !in_array($action, $allowed[$module], true)) return;
        $GLOBALS['airagliteMutationName'] = $module.'.'.$action;
        Hook::bind('show_json', 'aiRagLitePlugin.afterMutation');
    }

    public function afterMutation($result){
        if (!is_array($result) || empty($result['code'])) return $result;
        $reason = isset($GLOBALS['airagliteMutationName']) ? $GLOBALS['airagliteMutationName'] : 'changed';
        $config = $this->getConfig();
        $base = rtrim(trim(strval(isset($config['serviceUrl']) ? $config['serviceUrl'] : '')), '/');
        $key = trim(strval(isset($config['serviceKey']) ? $config['serviceKey'] : ''));
        if (!$this->validBase($base) || $key === '' || !function_exists('curl_init')) return $result;
        // Fire a bounded 600 ms hint. Failure never breaks a file save/deletion:
        // periodic reconciliation is the deliberate safety fallback.
        $ch = curl_init($base.'/v1/events');
        curl_setopt_array($ch, array(
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode(array('reason' => $reason)),
            CURLOPT_HTTPHEADER => array('Content-Type: application/json','X-RAG-Key: '.$key),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT_MS => 250,
            CURLOPT_TIMEOUT_MS => 600,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ));
        curl_exec($ch);
        curl_close($ch);
        return $result;
    }

    private function validBase($base){
        return !!preg_match('#^https?://[^/]+(:[0-9]+)?$#i', $base);
    }

    private function requestBackend($route, $payload, $method='POST'){
        KodUser::checkRoot();
        $config = $this->getConfig();
        $base = rtrim(trim(strval(isset($config['serviceUrl']) ? $config['serviceUrl'] : '')), '/');
        $key = trim(strval(isset($config['serviceKey']) ? $config['serviceKey'] : ''));
        if (!$this->validBase($base) || $key === '') show_json('RAG 插件未配置内网地址或密钥', false);
        if (!function_exists('curl_init')) show_json('PHP cURL 未启用', false);
        $ch = curl_init($base.'/v1/'.$route);
        $options = array(
            CURLOPT_HTTPHEADER => array('Content-Type: application/json','X-RAG-Key: '.$key),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => $route === 'ask' ? 180 : 30,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        );
        if ($method === 'POST') {
            $options[CURLOPT_POST] = true;
            $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_UNICODE);
        }
        curl_setopt_array($ch, $options);
        $response = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($response === false || $status !== 200) {
            show_json('RAG 服务不可用 (HTTP '.intval($status).'): '.($err ? $err : '检查服务日志'), false);
        }
        $data = json_decode($response, true);
        if (!is_array($data)) show_json('RAG 服务返回数据格式异常', false);
        show_json($data);
    }

    private function query($action){
        KodUser::checkRoot();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') show_json('POST only', false);
        $q = trim(strval(Input::get('q')));
        if (mb_strlen($q, 'UTF-8') < 2 || mb_strlen($q, 'UTF-8') > 300) {
            show_json('搜索内容需为 2-300 个字', false);
        }
        $this->requestBackend($action, array('q' => $q, 'limit' => 8));
    }

    /**
     * Search router shared by Kodbox document RAG and local AssetLedger.
     *
     * The asset branch is deterministic and never posts private inventory to
     * RAG, OpenAI, or a public network service. Only document scope calls the
     * configured backend. Admin session is enforced on both branches.
     */
    public function smart(){
        KodUser::checkRoot();
        if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
            show_json('只允许 POST', false);
        }
        $q = trim(strval(Input::get('q')));
        $len = function_exists('mb_strlen') ? mb_strlen($q, 'UTF-8') : strlen($q);
        if ($len < 2 || $len > 300) show_json('搜索内容需为 2-300 个字', false);
        $scope = trim(strval(Input::get('scope')));
        if (!in_array($scope, array('auto','assets','docs'), true)) $scope = 'auto';
        $route = strval(Input::get('ai')) === '1' ? 'ask' : 'search';
        if ($scope === 'docs') {
            $this->requestBackend($route, array('q'=>$q,'limit'=>8));
            return;
        }

        require_once(__DIR__.'/lib/AssetLedgerQuery.php');
        $ledgerPath = dirname(__DIR__).'/assetLedger/lib/AssetLedgerStore.php';
        if (!is_file($ledgerPath)) {
            if ($scope === 'assets' || AiRagLiteAssetQuery::wantsAssets($q, array())) {
                show_json('未找到 AssetLedger 插件。请先安装并启用数字资产中心。', false);
            }
            $this->requestBackend($route, array('q'=>$q,'limit'=>8));
            return;
        }
        try {
            require_once($ledgerPath);
            if (!defined('USER_SYSTEM')) throw new RuntimeException('Kodbox 数据路径不可用');
            $store = new AssetLedgerStore(USER_SYSTEM.'assetLedger/');
            $data = $store->all();
            if ($scope === 'assets' || AiRagLiteAssetQuery::wantsAssets($q, $data)) {
                show_json(AiRagLiteAssetQuery::run($q, $data), true);
                return;
            }
        } catch (Exception $e) {
            if ($scope === 'assets') show_json('无法读取 AssetLedger：'.$e->getMessage(), false);
            // In automatic mode, do not leak inventory data or failure details
            // to the document RAG. The request can still use document search.
        }
        $this->requestBackend($route, array('q'=>$q,'limit'=>8));
    }

    public function search(){ $this->query('search'); }
    public function ask(){ $this->query('ask'); }
    public function status(){ $this->requestBackend('status', null, 'GET'); }
    public function reindex(){ $this->requestBackend('events', array('reason'=>'manual')); }

    /**
     * Resolve a WebDAV-relative indexed path to an actual, currently readable
     * KodBox path. Do not concatenate the indexed path into a #fileView URL:
     * WebDAV paths and KodIO paths are different namespaces.
     *
     * This is intentionally admin-only like the existing search endpoint.
     * The browser never receives credentials or an arbitrary fileOut URL.
     */
    public function resolve(){
        KodUser::checkRoot();
        if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
            show_json('POST only', false);
        }
        $relative = Input::get('path');
        $parts = $this->davParts($relative);
        if ($parts === false) show_json('无效的文件路径', false);
        $resolved = $this->resolveDavFile($parts);
        if (!$resolved) {
            $detail = $this->lastResolveError ? '（'.$this->lastResolveError.'）' : '';
            show_json('无法定位原文件'.$detail.'。请确认当前登录账户对原文件有预览权限。', false);
        }
        // The actual preview route is owned by KodBox, which checks permissions
        // again when the user opens the document.
        // Return ONLY a same-site hash route. APP_HOST may reflect an internal
        // reverse-proxy host and must not be used as the browser's origin.
        $route = '#fileView&path='.rawurlencode($resolved['path']);
        show_json(array('route'=>$route, 'url'=>$route, 'name'=>$resolved['name']), true);
    }

    private function davParts($input){
        if (!is_string($input) || strlen($input) > 4096 || strlen($input) < 1) return false;
        if ($input[0] === '/' || strpos($input, "\\") !== false || strpos($input, "\0") !== false ||
            strpos($input, '://') !== false) return false;
        if (function_exists('mb_check_encoding') && !mb_check_encoding($input, 'UTF-8')) return false;
        $segments = explode('/', $input);
        if (count($segments) > 24) return false;
        foreach ($segments as $segment){
            if ($segment === '' || $segment === '.' || $segment === '..' || strlen($segment) > 255) return false;
            if (preg_match('/[\x00-\x1f\x7f]/', $segment)) return false;
        }
        return $segments;
    }

    private function resolveDavFile($parts){
        $homeID = Session::get('kodUser.sourceInfo.sourceID');
        $home = $homeID ? KodIO::make($homeID) : (defined('MY_HOME') ? MY_HOME : '');
        if (!$home) return false;

        $first = $parts[0];
        $roots = array(
            array('names'=>array(LNG('explorer.toolbar.rootPath'),'我的文档','个人空间','my'), 'path'=>$home),
            array('names'=>array(LNG('explorer.toolbar.shareToMe'),'与我协作'), 'path'=>KodIO::KOD_USER_SHARE_TO_ME),
            array('names'=>array(LNG('explorer.toolbar.myGroup'),'我所在的部门'), 'path'=>KodIO::KOD_GROUP_ROOT_SELF),
        );
        // WebDAV can expose the visible group root by its actual name.
        $groups = Action('filter.userGroup')->userGroupRoot();
        if (is_array($groups) && !empty($groups[0])) {
            $groupInfo = Model('Group')->getInfo($groups[0]);
            if (is_array($groupInfo) && !empty($groupInfo['name']) && !empty($groupInfo['sourceInfo']['sourceID'])) {
                $roots[] = array('names'=>array($groupInfo['name']),
                                 'path'=>KodIO::make($groupInfo['sourceInfo']['sourceID']));
            }
        }
        // A dedicated rag_reader may index an owner's own files as a virtual
        // share path. If the viewer *is* that owner, resolve their real home
        // first, before exploring a potentially missing virtual share tree.
        $viewer = Session::get('kodUser');
        $viewerName = is_array($viewer) && isset($viewer['name']) ? $viewer['name'] : '';
        if (count($parts) >= 4 && $viewerName !== '' &&
            in_array($parts[0], array(LNG('explorer.toolbar.shareToMe'),'与我协作'), true) &&
            $parts[1] === '用户['.$viewerName.']' &&
            in_array($parts[2], array(LNG('explorer.toolbar.rootPath'),'我的文档','个人空间','my'), true)) {
            // In a collaborator DAV path, the third segment is the SHARED
            // FOLDER NAME, not a virtual name of the owner's home directory.
            // For example:
            //   shareToMe/user[admin]/My Documents/Learning/file.md
            // maps to the owner's home / My Documents / Learning / file.md.
            // Dropping the shared-folder segment previously resolved the wrong
            // location (and could even open a same-named unrelated file).
            $file = $this->walkReadOnly($home, array_slice($parts, 2));
            if ($file) return $file;
            // Do not try other namespaces after matching the owner. A less
            // specific fallback might find a same-named but unrelated file.
            return false;
        }
        foreach ($roots as $root){
            if (in_array($first, $root['names'], true)) {
                $file = $this->walkReadOnly($root['path'], array_slice($parts, 1));
                if ($file) return $file;
            }
        }

        // Some WebDAV installations have pathAllow=self: the root is the user's
        // home directory, so the index contains only folders under MY_HOME.
        // Never use this fallback for another recognized virtual root.
        foreach ($roots as $root){
            if (in_array($first, $root['names'], true)) return false;
        }
        return $this->walkReadOnly($home, $parts);
    }

    private function walkReadOnly($root, $segments){
        if (!$root || !count($segments)) return false;
        $path = $root;
        // KodBox may paginate listings by default; here each directory must be
        // checked against a complete list. Restore request globals afterwards.
        $oldPage = isset($GLOBALS['in']['pageNum']) ? $GLOBALS['in']['pageNum'] : null;
        $hadPage = isset($GLOBALS['in']) && array_key_exists('pageNum', $GLOBALS['in']);
        if (!isset($GLOBALS['in']) || !is_array($GLOBALS['in'])) $GLOBALS['in'] = array();
        $GLOBALS['in']['pageNum'] = -1;
        try {
            foreach ($segments as $index => $segment){
                $listing = Action('explorer.list')->path($path);
                $file = ($index === count($segments)-1);
                $key = $file ? 'fileList' : 'folderList';
                if (!is_array($listing) || empty($listing[$key]) || !is_array($listing[$key])) {
                    $this->lastResolveError = '没有找到'.($file ? '文件' : '目录').'：'.$segment;
                    return false;
                }
                $found = false;
                foreach ($listing[$key] as $entry){
                    if (!is_array($entry) || !isset($entry['name']) || !isset($entry['path'])) continue;
                    // WebDAV presents names containing '/' using '@' instead.
                    if ($entry['name'] !== $segment && str_replace('/', '@', $entry['name']) !== $segment) continue;
                    if (isset($entry['isDelete']) && $entry['isDelete'] == '1') continue;
                    $path = $entry['path'];
                    $found = true;
                    if ($file) {
                        if (!Action('explorer.auth')->fileCan($path,'view')) {
                            $this->lastResolveError = '当前账户无预览权限：'.$segment;
                            return false;
                        }
                        $info = IO::infoFull($path);
                        if (!is_array($info) || !isset($info['type']) || $info['type'] !== 'file' ||
                            (isset($info['isDelete']) && $info['isDelete'] == '1')) {
                            $this->lastResolveError = '文件已不存在或无法读取：'.$segment;
                            return false;
                        }
                        return array('path'=>$path, 'name'=>$entry['name']);
                    }
                    break;
                }
                if (!$found) {
                    $this->lastResolveError = '未找到'.($file ? '文件' : '目录').'：'.$segment;
                    return false;
                }
            }
        } finally {
            if ($hadPage) $GLOBALS['in']['pageNum'] = $oldPage;
            else unset($GLOBALS['in']['pageNum']);
        }
        return false;
    }
}
