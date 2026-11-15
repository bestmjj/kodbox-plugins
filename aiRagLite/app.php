<?php
/**
 * KodBox 1.70.03 compatible community RAG plugin (v0.5.0).
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
        $this->echoFile('static/writer.js');
        $this->echoFile('static/assistant.js');
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

    private function backendData($route, $payload, $method='POST'){
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
            CURLOPT_TIMEOUT => in_array($route, array('ask','draft','revise','assistant-chat'), true) ? 180 : 30,
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
        return $data;
    }

    private function requestBackend($route, $payload, $method='POST'){
        show_json($this->backendData($route, $payload, $method));
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

    /**
     * Chat-first assistant. The only file context it can send to the model
     * is a document the current KodBox admin can open via DocumentWriter.
     * AssetLedger questions stay fully local and deterministic.
     */
    public function assistantChat(){
        KodUser::checkRoot();
        if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST')
            show_json('POST only',false);
        $message=trim(strval(Input::get('message')));
        $length=function_exists('mb_strlen') ? mb_strlen($message,'UTF-8') : strlen($message);
        if ($length<2 || $length>1800) show_json('请输入 2-1800 字的要求',false);

        $rawHistory=Input::get('history_json');
        if (!is_string($rawHistory) || strlen($rawHistory)>26000) $rawHistory='[]';
        $provided=json_decode($rawHistory,true);
        $history=array();
        if (is_array($provided)) {
            foreach (array_slice($provided,-8) as $entry) {
                if (!is_array($entry) || !isset($entry['role'],$entry['content']) ||
                    !in_array($entry['role'],array('user','assistant'),true) ||
                    !is_string($entry['content'])) continue;
                $content=trim($entry['content']);
                $len=function_exists('mb_strlen') ? mb_strlen($content,'UTF-8') : strlen($content);
                if (!$content || $len>2400) continue;
                $history[]=array('role'=>$entry['role'],'content'=>$content);
            }
        }
        $folder=Input::get('file_folder');
        $name=Input::get('file_name');
        $folder=is_string($folder)?$folder:'';
        $name=is_string($name)?$name:'';
        if ($folder!=='' && $name==='') show_json('关联的文件名称为空',false);
        $doc=null;
        if ($name!=='') {
            require_once(__DIR__.'/lib/DocumentWriter.php');
            $config=$this->getConfig();
            $base=rtrim(trim(strval(isset($config['serviceUrl'])?$config['serviceUrl']:'')),'/');
            $key=trim(strval(isset($config['serviceKey'])?$config['serviceKey']:'')); 
            try {
                $loaded=AiRagLiteDocumentWriter::readDocument($folder,$name,$base,$key);
            } catch (Exception $exc) {
                show_json('无法读取关联文件：'.$exc->getMessage(),false);
            }
            // Limit model context explicitly; do not claim to analyze unseen pages.
            $full=$loaded['content'];
            $maxChars=6000;
            $length=function_exists('mb_strlen') ? mb_strlen($full,'UTF-8') : strlen($full);
            $truncated=$length>$maxChars;
            $snippet=$truncated ? (function_exists('mb_substr') ?
                mb_substr($full,0,$maxChars,'UTF-8') : substr($full,0,$maxChars)) : $full;
            $doc=array('name'=>$loaded['name'],'content'=>$snippet,'truncated'=>$truncated);

            // An explicit edit request returns a proposal ONLY. Browser must
            // show a diff and ask the admin to apply/save it separately.
            $changeIntent=preg_match('/(?:^|[，。；\s])(?:帮我|请|替我|把|将|给我|直接)?(?:修改|润色|改写|扩写|精简|重写|修订|补充)(?:这篇|文章|全文|正文|一下|第|内容|文档|表格)?/u',$message) &&
                          !preg_match('/^(怎么|如何|为什么|能否|可否|是否)/u',$message);
            if ($changeIntent) {
                if ($truncated || (function_exists('mb_strlen') ?
                        mb_strlen($full,'UTF-8')>14000 : strlen($full)>14000)) {
                    show_json('文章较长，不能直接生成全文修改稿。请先用旧版文档编辑器选中段落进行修改。',false);
                }
                $revised=$this->backendData('revise',array(
                    'content'=>$full,'instructions'=>$message,'scope'=>'full'
                ));
                $new=isset($revised['content']) && is_string($revised['content'])
                    ? trim($revised['content']) : '';
                if ($new==='') show_json('模型没有返回可用的修改稿',false);
                show_json(array(
                    'answer'=>'我已根据您的要求生成修改建议。**原文件没有改变。** 点击下方“查看差异并确认”后，可以对比、应用，再选择另存或备份后更新原文件。',
                    'mode'=>'proposal',
                    'proposal'=>array('kind'=>'revision','folder'=>$folder,
                        'name'=>$name,'content'=>$new),
                    'sources'=>array(),
                ),true);
            }
        }

        // AssetLedger never leaves the local PHP process. Only applicable
        // when there is no explicitly attached document.
        if ($doc===null &&
            !preg_match('/文档|文件|知识库|笔记|教程|部署|日志|手册|文章/u',$message)) {
            $ledgerPath=dirname(__DIR__).'/assetLedger/lib/AssetLedgerStore.php';
            if (is_file($ledgerPath)) {
                try {
                    require_once(__DIR__.'/lib/AssetLedgerQuery.php');
                    require_once($ledgerPath);
                    if (defined('USER_SYSTEM')) {
                        $ledger=new AssetLedgerStore(USER_SYSTEM.'assetLedger/');
                        $inventory=$ledger->all();
                        if (AiRagLiteAssetQuery::wantsAssets($message,$inventory)) {
                            $result=AiRagLiteAssetQuery::run($message,$inventory);
                            show_json(array(
                                'answer'=>$result['answer'],
                                'mode'=>'asset_live',
                                'asset_results'=>$result['results'],
                                'source_note'=>$result['note'],
                                'sources'=>array()
                            ),true);
                        }
                    }
                } catch (Exception $exc) {
                    // On asset-related queries fail closed: never forward
                    // private inventory names to the external language model.
                    if (preg_match('/数字资产|资产台账|资产关联|资产清单|我的资产|待核实/u',$message))
                        show_json('AssetLedger 实时查询失败，请检查插件状态',false);
                }
            }
        }
        if ($doc===null && preg_match('/(?:这篇|这份|当前|本篇).{0,12}(?:文档|文章|文件|费用|账单)/u',$message)) {
            show_json(array('answer'=>'请先在助手顶部点击“关联文件”，选择您要分析的 KodBox 文档。关联后直接问“总结今年的费用”即可；不会修改原文件。','mode'=>'needs_file','sources'=>array()),true);
        }

        // Explicit request to draft a NEW document, never overwrite old ones.
        if ($doc===null && preg_match('/(?:帮我写|请写|写一份|起草|撰写|帮我生成|生成一份).{0,65}(?:文档|文章|报告|方案|手册|总结|计划)/u',$message)) {
            $topic=function_exists('mb_substr')?mb_substr($message,0,120,'UTF-8'):substr($message,0,120);
            $draft=$this->backendData('draft',array(
                'topic'=>$topic,'requirements'=>$message,'use_sources'=>false));
            $content=isset($draft['content'])?$draft['content']:'';
            if (!is_string($content) || trim($content)==='')
                show_json('模型没有返回有效文档草稿',false);
            show_json(array(
                'answer'=>'草稿已生成。您可以继续描述想调整的地方；点击“在编辑器中检查并保存”后，才会进入保存流程。',
                'mode'=>'proposal','proposal'=>array(
                    'kind'=>'new','title'=>'AI 新文档','content'=>$content
                ),'sources'=>array()
            ),true);
        }
        $this->requestBackend('assistant-chat',array(
            'message'=>$message,'history'=>$history,'document'=>$doc
        ));
    }

    /**
     * Agent model step: uses only the existing RAG key, never KodBox credentials.
     * Tool decisions are inert until agentTool validates/executes them.
     */
    public function agentStep() {
        KodUser::checkRoot();
        if (($_SERVER['REQUEST_METHOD'] ?? '')!=='POST') show_json('POST only',false);
        $message=trim(strval(Input::get('message')));
        if ($message==='' || strlen($message)>5400) show_json('任务内容长度不符合限制',false);
        $history=json_decode(strval(Input::get('history_json')),true);
        $observations=json_decode(strval(Input::get('observations_json')),true);
        if (!is_array($history)) $history=array();
        if (!is_array($observations)) $observations=array();
        $cleanHistory=array();
        foreach (array_slice($history,-6) as $turn) {
            if (!is_array($turn) || !isset($turn['role'],$turn['content']) ||
                !in_array($turn['role'],array('user','assistant'),true) ||
                !is_string($turn['content']) || strlen($turn['content'])>5400) continue;
            $cleanHistory[]=array('role'=>$turn['role'],'content'=>$turn['content']);
        }
        $cleanObs=array();
        foreach (array_slice($observations,-5) as $obs) {
            if (!is_array($obs) || !isset($obs['tool'],$obs['arguments'],$obs['result']) ||
                !is_string($obs['tool']) || !is_array($obs['arguments']) ||
                !is_string($obs['result'])) continue;
            $cleanObs[]=array('tool'=>substr($obs['tool'],0,50),
                'arguments'=>$obs['arguments'],
                'result'=>substr($obs['result'],0,7000));
        }
        $folder=strval(Input::get('file_folder'));
        $name=strval(Input::get('file_name'));
        $current=null;
        if ($name!=='' && strlen($name)<=255 && strlen($folder)<=2048) {
            // Tool results are authoritative; these strings are only hints.
            $current=array('folder'=>$folder,'name'=>$name);
        }

        // Private AssetLedger data is handled locally, never sent as LLM
        // messages or replayed into external chat history.
        if (!$cleanObs) {
            $ledgerPath=dirname(__DIR__).'/assetLedger/lib/AssetLedgerStore.php';
            if (is_file($ledgerPath)) {
                try {
                    require_once(__DIR__.'/lib/AssetLedgerQuery.php');
                    require_once($ledgerPath);
                    if (defined('USER_SYSTEM')) {
                        $store=new AssetLedgerStore(USER_SYSTEM.'assetLedger/');
                        $inventory=$store->all();
                        if (AiRagLiteAssetQuery::wantsAssets($message,$inventory)) {
                            $result=AiRagLiteAssetQuery::run($message,$inventory);
                            show_json(array('kind'=>'final','answer'=>$result['answer'],
                                'mode'=>'asset_live','sources'=>array()),true);
                        }
                    }
                } catch (Exception $exc) {
                    if (preg_match('/数字资产|资产台账|资产关联|我的资产/u',$message))
                        show_json('AssetLedger 本地查询失败，请检查资产插件状态',false);
                }
            }
        }
        $force=strval(Input::get('force_final'))==='1';
        $this->requestBackend('agent-step',array(
            'message'=>$message,'history'=>$cleanHistory,'observations'=>$cleanObs,
            'current_file'=>$current,'force_final'=>$force
        ));
    }

    /**
     * The model never gets direct write permissions. All tools are authorized
     * under the current KodBox admin session, with strict tool-name allowlist.
     */
    /**
     * RAG/WebDAV index paths (e.g. 与我协作/用户[admin]/我的文档/...)
     * are NOT personal-home relative folders. Resolve them through the
     * existing KodBox session-permission-controlled DAV resolver.
     * An exact filename match is required; never guess a different file.
     */
    private function agentReadDocument($folder,$name,$args,$base,$key) {
        $indexed=trim(strval($args['indexed_path'] ?? ''));
        if ($indexed==='' && (strpos($folder,'与我协作/')===0 ||
            strpos($folder,'我所在的部门/')===0)) {
            $indexed=rtrim($folder,'/').'/'.$name;
        }
        if ($indexed==='') {
            return AiRagLiteDocumentWriter::readDocument($folder,$name,$base,$key);
        }
        $parts=$this->davParts($indexed);
        if ($parts===false || count($parts)<2 || end($parts)!==$name)
            throw new RuntimeException('索引路径与所请求的文件名不一致');
        $this->lastResolveError='';
        $resolved=$this->resolveDavFile($parts);
        if (!$resolved) {
            $detail=$this->lastResolveError ? '：'.$this->lastResolveError : '';
            throw new RuntimeException('无法按当前 KodBox 账号权限定位索引原文件'.$detail);
        }
        if ($resolved['name']!==$name)
            throw new RuntimeException('已验证文件与请求文件名不一致');
        return AiRagLiteDocumentWriter::readVerifiedDocument($resolved,$base,$key);
    }

    public function agentTool() {
        KodUser::checkRoot();
        if (($_SERVER['REQUEST_METHOD'] ?? '')!=='POST') show_json('POST only',false);
        $tool=strval(Input::get('tool'));
        $raw=Input::get('arguments_json');
        if (!is_string($raw) || strlen($raw)>3500) show_json('工具参数长度无效',false);
        $args=json_decode($raw,true);
        // Some KodBox request serializers return a JSON-encoded JSON string.
        // Unwrap at most once; never evaluate or execute model-provided content.
        if (is_string($args)) $args=json_decode($args,true);
        $toolFields=array(
            'list_folder'=>array('folder'),
            'read_document'=>array('folder','name','indexed_path'),
            'find_files'=>array('query'),
            'search_knowledge'=>array('query'),
            'calculate_expenses'=>array('folder','name','indexed_path'),
            'prepare_edit'=>array('folder','name','instructions'),
            'prepare_new_document'=>array('title','instructions'),
        );
        if (!isset($toolFields[$tool])) show_json('不支持的 Agent 工具',false);
        if (!is_array($args) || count($args)>12)
            show_json('Agent 工具参数不是有效 JSON 对象',false);
        // Read-only searches may include model-generated optional parameters
        // such as limit/path. Ignore them; only the query may reach the index.
        if ($tool==='find_files' || $tool==='search_knowledge') {
            $query=$args['query'] ?? ($args['q'] ?? null);
            if (!is_string($query)) show_json('检索工具缺少有效 query 字符串',false);
            $args=array('query'=>$query);
        } else {
            foreach ($args as $key=>$value) {
                if (!is_string($key) || !in_array($key,$toolFields[$tool],true))
                    show_json('工具 '.$tool.' 包含不支持的参数字段',false);
            }
        }
        foreach ($args as $key=>$value) {
            if (!is_string($key) || !is_string($value) || strlen($value)>2048)
                show_json('工具参数必须为限定长度的字符串',false);
        }
        $folder=isset($args['folder'])?$args['folder']:'';
        $name=isset($args['name'])?$args['name']:'';
        $config=$this->getConfig();
        $base=rtrim(trim(strval($config['serviceUrl'] ?? '')),'/');
        $key=trim(strval($config['serviceKey'] ?? ''));
        require_once(__DIR__.'/lib/DocumentWriter.php');
        try {
            switch ($tool) {
                case 'list_folder':
                    if (!array_key_exists('folder',$args)) throw new RuntimeException('缺少文件夹参数');
                    $out=AiRagLiteDocumentWriter::agentList($folder);
                    break;
                case 'read_document':
                    if (!$name) throw new RuntimeException('缺少具体文件名');
                    $doc=$this->agentReadDocument($folder,$name,$args,$base,$key);
                    $original=$doc['content'];
                    $length=function_exists('mb_strlen')?mb_strlen($original,'UTF-8'):strlen($original);
                    $truncated=$length>5500;
                    $body=$truncated?(function_exists('mb_substr')?
                        mb_substr($original,0,5500,'UTF-8'):substr($original,0,5500)):$original;
                    $out=array('folder'=>$folder,'name'=>$name,'content'=>$body,
                        'truncated'=>$truncated,'total_chars'=>$length);
                    break;
                case 'find_files':
                    $q=trim(strval($args['query'] ?? ''));
                    if (strlen($q)<2 || strlen($q)>900)
                        throw new RuntimeException('文件查询词过短或过长');
                    // Reuse the SAME indexed search endpoint as the proven RAG UI.
                    // WebDAV paths are suggestions only, never KodBox file permissions.
                    $search=$this->backendData('search',array('q'=>$q,'limit'=>8));
                    require_once(__DIR__.'/lib/IndexedFileLocator.php');
                    $out=AiRagLiteIndexedFileLocator::rank($search,$q,8);
                    break;
                case 'search_knowledge':
                    $q=trim(strval($args['query'] ?? ''));
                    if (strlen($q)<2 || strlen($q)>900)
                        throw new RuntimeException('知识库搜索词过短或过长');
                    $search=$this->backendData('search',array('q'=>$q,'limit'=>8));
                    $hits=is_array($search['results'] ?? null)?$search['results']:array();
                    $found=array();
                    foreach (array_slice($hits,0,8) as $h) {
                        if (!is_array($h)) continue;
                        $found[]=array('name'=>strval($h['name'] ?? ''),
                            'path'=>strval($h['path'] ?? ''),
                            'location'=>strval($h['location'] ?? ''),
                            'snippet'=>substr(strval($h['snippet'] ?? ''),0,600));
                    }
                    $out=array('query'=>$q,'results'=>$found,
                        'note'=>'仅是索引片段。打开原文件仍须 KodBox 会话权限校验。');
                    break;
                case 'calculate_expenses':
                    if (!$name) throw new RuntimeException('缺少费用文件名');
                    $doc=$this->agentReadDocument($folder,$name,$args,$base,$key);
                    $summary=$this->backendData('agent-expenses',array(
                        'content'=>$doc['content'],'question'=>'统计费用总计'));
                    $out=array('folder'=>$folder,'name'=>$name,
                        'summary'=>$summary['summary'] ?? null);
                    break;
                case 'prepare_edit':
                    if (!$name) throw new RuntimeException('缺少编辑文件');
                    $instructions=trim(strval($args['instructions'] ?? ''));
                    if (strlen($instructions)<3 || strlen($instructions)>2000)
                        throw new RuntimeException('修改要求无效');
                    $doc=AiRagLiteDocumentWriter::readDocument($folder,$name,$base,$key);
                    $body=$doc['content'];
                    if (strlen($body)>14000) throw new RuntimeException('原文太长，请分段修改');
                    $changed=$this->backendData('revise',array(
                        'content'=>$body,'instructions'=>$instructions,'scope'=>'full'));
                    $candidate=strval($changed['content'] ?? '');
                    if (trim($candidate)==='' || strlen($candidate)>50000)
                        throw new RuntimeException('模型未返回可用修改稿');
                    $out=array('message'=>'已生成修改稿，原文没有变化，请审阅差异。',
                        'proposal'=>array('kind'=>'revision','folder'=>$folder,
                            'name'=>$name,'content'=>$candidate,'hash'=>$doc['hash'],'format'=>$doc['format']));
                    break;
                case 'prepare_new_document':
                    $title=AiRagLiteDocumentWriter::cleanTitle(strval($args['title'] ?? ''));
                    $instructions=trim(strval($args['instructions'] ?? ''));
                    if (strlen($instructions)<3 || strlen($instructions)>2000)
                        throw new RuntimeException('写作要求无效');
                    $draft=$this->backendData('draft',array('topic'=>$title,
                        'requirements'=>$instructions,'use_sources'=>false));
                    $body=strval($draft['content'] ?? '');
                    if (trim($body)==='') throw new RuntimeException('模型未生成草稿');
                    $out=array('message'=>'已生成待审核草稿，尚未保存到 KodBox。',
                        'proposal'=>array('kind'=>'new','title'=>$title,'content'=>$body));
                    break;
            }
            show_json($out,true);
        } catch (Exception $exc) {
            show_json('工具执行失败：'.$exc->getMessage(),false);
        }
    }

    public function agentCurrentFile() {
        KodUser::checkRoot();
        if (($_SERVER['REQUEST_METHOD'] ?? '')!=='POST') show_json('POST only',false);
        require_once(__DIR__.'/lib/DocumentWriter.php');
        try {
            $out=AiRagLiteDocumentWriter::fromActiveFilePath(Input::get('path'));
            show_json($out,true);
        } catch (Exception $exc) {
            show_json('无法关联当前文件：'.$exc->getMessage(),false);
        }
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

    // Drafting uses the existing RAG chat model; no extra model credentials.
    public function draft(){
        KodUser::checkRoot();
        if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') show_json('POST only', false);
        $topic = trim(strval(Input::get('topic')));
        $requirements = trim(strval(Input::get('requirements')));
        $length = function_exists('mb_strlen') ? mb_strlen($topic,'UTF-8') : strlen($topic);
        if ($length < 2 || $length > 160 || strlen($requirements) > 6000) {
            show_json('文档主题或写作要求长度不符合限制', false);
        }
        $useSources = strval(Input::get('use_sources')) === '1';
        $this->requestBackend('draft', array('topic'=>$topic,'requirements'=>$requirements,'use_sources'=>$useSources));
    }

    public function reviseDraft(){
        KodUser::checkRoot();
        if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST')
            show_json('POST only', false);
        $content=Input::get('content');
        $instructions=trim(strval(Input::get('instructions')));
        $scope=strval(Input::get('scope'));
        if (!is_string($content) || trim($content)==='' || strlen($content)>42000 ||
            $instructions==='' || strlen($instructions)>6000 ||
            !in_array($scope,array('full','selection'),true))
            show_json('原文、修改要求或修改范围无效',false);
        $this->requestBackend('revise',array(
            'content'=>$content, 'instructions'=>$instructions, 'scope'=>$scope));
    }

    public function writerRead(){
        KodUser::checkRoot();
        if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST')
            show_json('POST only',false);
        require_once(__DIR__.'/lib/DocumentWriter.php');
        $config=$this->getConfig();
        $base=rtrim(trim(strval(isset($config['serviceUrl'])?$config['serviceUrl']:'')),'/');
        $key=trim(strval(isset($config['serviceKey'])?$config['serviceKey']:''));
        try {
            $data=AiRagLiteDocumentWriter::readDocument(
                strval(Input::get('folder')),strval(Input::get('name')),$base,$key);
            show_json($data,true);
        } catch (Exception $exc) {
            show_json('打开已有文章失败：'.$exc->getMessage(),false);
        }
    }

    public function writerOverwrite(){
        KodUser::checkRoot();
        if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST')
            show_json('POST only',false);
        if (strval(Input::get('confirm'))!=='backup-and-overwrite')
            show_json('请明确确认先备份再更新原文件',false);
        require_once(__DIR__.'/lib/DocumentWriter.php');
        try {
            $saved=AiRagLiteDocumentWriter::overwriteDocument(
                strval(Input::get('folder')),strval(Input::get('name')),
                strval(Input::get('hash')),strval(Input::get('content')));
            $this->afterMutation(array('code'=>true));
            show_json($saved,true);
        } catch (Exception $exc) {
            show_json('更新原文件失败：'.$exc->getMessage(),false);
        }
    }

    public function writerFolders(){
        KodUser::checkRoot();
        if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') show_json('POST only', false);
        require_once(__DIR__.'/lib/DocumentWriter.php');
        try {
            $folder = Input::get('folder');
            $data = AiRagLiteDocumentWriter::listFolders(is_string($folder) ? $folder : '');
            show_json($data, true);
        } catch (Exception $exc) {
            show_json('读取文件夹失败：'.$exc->getMessage(), false);
        }
    }

    public function saveDraft(){
        KodUser::checkRoot();
        if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') show_json('POST only', false);
        require_once(__DIR__.'/lib/DocumentWriter.php');
        $config = $this->getConfig();
        $base = rtrim(trim(strval(isset($config['serviceUrl']) ? $config['serviceUrl'] : '')), '/');
        $key = trim(strval(isset($config['serviceKey']) ? $config['serviceKey'] : ''));
        $folder = isset($this->in['folder']) ? $this->in['folder'] : 'AI草稿';
        try {
            $saved = AiRagLiteDocumentWriter::save(strval(Input::get('title')),
                strval(Input::get('content')), strval(Input::get('format')),
                $base, $key, $folder);
            // Plugin writes bypass explorer.index.mkfile; hint the incremental indexer.
            $this->afterMutation(array('code'=>true));
            show_json($saved, true);
        } catch (Exception $exc) {
            show_json('保存文档失败：'.$exc->getMessage(), false);
        }
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
