<?php
/** Kodbox AssetLedger plugin; root-only, authenticated, POST+CSRF API. */
class assetLedgerPlugin extends PluginBase {
    function __construct() { parent::__construct(); }

    public function regist() {
        $this->hookRegist(array('user.commonJs.insert' => 'assetLedgerPlugin.echoJs'));
    }

    public function echoJs() {
        if (!KodUser::isRoot()) return;
        $this->echoFile('static/main.js');
    }

    private function getToken() {
        $key = 'assetLedgerCsrf';
        $token = Session::get($key);
        if (!$token || !is_string($token)) {
            $token = bin2hex(random_bytes(24));
            Session::set($key, $token);
        }
        return $token;
    }

    public function page() {
        KodUser::checkRoot();
        header('Cache-Control: private, no-store, max-age=0');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: no-referrer');
        $appConfig = array('apiBase'=>$this->pluginApi, 'csrf'=>$this->getToken());
        include($this->pluginPath . 'static/page.php');
    }

    public function api() {
        KodUser::checkRoot();
        header('Cache-Control: private, no-store, max-age=0');
        header('X-Content-Type-Options: nosniff');
        if (!isset($_SERVER['REQUEST_METHOD']) || strtoupper($_SERVER['REQUEST_METHOD']) !== 'POST') {
            show_json('只允许 POST 请求', false);
        }
        $token = Session::get('assetLedgerCsrf');
        $provided = isset($_POST['csrf']) ? (string)$_POST['csrf'] : '';
        if (!is_string($token) || !hash_equals($token, $provided)) {
            show_json('请求安全校验未通过，请刷新数字资产页面', false);
        }
        $op = isset($_POST['op']) ? (string)$_POST['op'] : 'list';
        $raw = isset($_POST['data']) ? (string)$_POST['data'] : '{}';
        if (strlen($raw) > 2097152) show_json('单次提交不能超过 2 MiB', false);
        $input = json_decode($raw, true);
        if (!is_array($input)) show_json('请求 JSON 格式错误', false);
        require_once($this->pluginPath . 'lib/AssetLedgerStore.php');
        try {
            $store = new AssetLedgerStore(USER_SYSTEM . 'assetLedger/');
            $wallos = null;
            if (in_array($op, array('wallosConfig','wallosSaveConfig','wallosClearConfig','wallosList'), true)) {
                require_once($this->pluginPath . 'lib/AssetLedgerWallos.php');
                $wallos = new AssetLedgerWallos(USER_SYSTEM . 'assetLedger/');
            }
            switch ($op) {
                case 'wallosConfig': $result = $wallos->getPublicConfig(); break;
                case 'wallosSaveConfig':
                    $result = $wallos->saveConfig(
                        isset($input['url']) ? $input['url'] : '',
                        isset($input['apiKey']) ? $input['apiKey'] : ''
                    ); break;
                case 'wallosClearConfig': $result = $wallos->clearConfig(); break;
                case 'wallosList': $result = $wallos->listSubscriptions(); break;
                case 'list':       $result = $store->all(); break;
                case 'save':       $result = $store->save(isset($input['record'])?$input['record']:null); break;
                case 'remove':     $result = $store->remove(isset($input['id'])?$input['id']:null); break;
                case 'addType':    $result = $store->addType(isset($input['name'])?$input['name']:''); break;
                case 'renameType': $result = $store->renameType(isset($input['id'])?$input['id']:'', isset($input['name'])?$input['name']:''); break;
                case 'removeType': $result = $store->removeType(isset($input['id'])?$input['id']:''); break;
                case 'import':     $result = $store->import($input); break;
                default:          throw new InvalidArgumentException('不支持的操作');
            }
            show_json($result, true);
        } catch (Exception $e) {
            show_json($e->getMessage(), false);
        }
    }
}
