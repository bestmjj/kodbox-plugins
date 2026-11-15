<?php
/** Regress RAG WebDAV virtual path -> authorized KodBox read; no network or private data. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

class PluginBase {
    public function __construct() {}
    public function getConfig() {return array('serviceUrl'=>'http://rag-api:8787','serviceKey'=>'test');}
}
class KodUser { public static function checkRoot() {} }
class Input {
    public static $values=array();
    public static function get($key) {return self::$values[$key] ?? null;}
}
class TestResponse extends RuntimeException {
    public $payload;
    public function __construct($payload,$good) {
        $this->payload=$payload;
        parent::__construct(is_string($payload)?$payload:json_encode($payload),$good?200:400);
    }
}
function show_json($payload,$good=true) {throw new TestResponse($payload,$good);}
function LNG($key) {
    $names=array(
        'explorer.toolbar.rootPath'=>'我的文档',
        'explorer.toolbar.shareToMe'=>'与我协作',
        'explorer.toolbar.myGroup'=>'我所在的部门',
    );
    return $names[$key] ?? $key;
}
class Session {
    public static function get($key) {
        if ($key==='kodUser.sourceInfo.sourceID') return 1001;
        if ($key==='kodUser') return array('name'=>'admin');
        return null;
    }
}
class KodIO {
    const KOD_USER_SHARE_TO_ME='share-root';
    const KOD_GROUP_ROOT_SELF='group-root';
    public static function make($id) {return 'home';}
}
class FakeAction {
    private $name;
    public function __construct($name) {$this->name=$name;}
    public function userGroupRoot() {return array();}
    public function fileCan($path,$operation) {
        if ($operation==='view' && $path==='file') return !FakeState::$denyRead;
        return true;
    }
    public function path($path) {
        if ($path==='home') return array('folderList'=>array(
            array('name'=>'我的文档','path'=>'docs')));
        if ($path==='docs') return array('folderList'=>array(
            array('name'=>'工作','path'=>'work')));
        if ($path==='work') return array('folderList'=>array(
            array('name'=>'财务','path'=>'finance')));
        if ($path==='finance') return array('fileList'=>array(
            array('name'=>'2026年费用.md','path'=>'file','size'=>50)));
        return array('fileList'=>array(),'folderList'=>array());
    }
}
function Action($name) {return new FakeAction($name);}
class FakeState {public static $denyRead=false;}
class IO {
    public static function infoFull($path) {
        return $path==='file'?array('type'=>'file','size'=>50):false;
    }
    public static function getContent($path) {
        return $path==='file'?"# 2026年费用\n|项目|金额|\n|---|---|\n|服务器|30元|\n":false;
    }
}
$_SERVER['REQUEST_METHOD']='POST';
require_once __DIR__.'/../app.php';

function runAgent($args,$tool='read_document') {
    Input::$values=array('tool'=>$tool,'arguments_json'=>json_encode($args));
    try {(new aiRagLitePlugin())->agentTool();}
    catch (TestResponse $e) {return $e;}
    throw new RuntimeException('Agent tool did not return');
}
function check($condition,$label) {
    if (!$condition) {fwrite(STDERR,'FAIL: '.$label."\n");exit(1);}
    echo 'PASS: '.$label."\n";
}
$indexed='与我协作/用户[admin]/我的文档/工作/财务/2026年费用.md';
$good=runAgent(array('folder'=>'与我协作','name'=>'2026年费用.md','indexed_path'=>$indexed));
check($good->getCode()===200 && is_array($good->payload) &&
    strpos($good->payload['content'],'服务器|30元')!==false,
    'read_document resolves and reads the exact authorized RAG index candidate');
$byFolder=runAgent(array('folder'=>'与我协作/用户[admin]/我的文档/工作/财务',
    'name'=>'2026年费用.md'));
check($byFolder->getCode()===200 && is_array($byFolder->payload),
    'exact virtual folder can be resolved without an explicit index_path');
$badFolder=runAgent(array('folder'=>'与我协作','name'=>'2026年费用.md'));
check($badFolder->getCode()===400,
    'an incomplete virtual folder is never guessed as a personal-space directory');
$mismatch=runAgent(array('folder'=>'与我协作','name'=>'2026年费用.md',
    'indexed_path'=>'与我协作/用户[admin]/我的文档/工作/财务/其他.md'));
check($mismatch->getCode()===400 && strpos($mismatch->getMessage(),'不一致')!==false,
    'a mismatched indexed filename is rejected');
$traversal=runAgent(array('folder'=>'与我协作','name'=>'2026年费用.md',
    'indexed_path'=>'与我协作/用户[admin]/../2026年费用.md'));
check($traversal->getCode()===400,
    'index traversal segments are rejected');
FakeState::$denyRead=true;
$denied=runAgent(array('folder'=>'与我协作','name'=>'2026年费用.md','indexed_path'=>$indexed));
check($denied->getCode()===400,
    'a missing KodBox view permission blocks indexed document reading');
FakeState::$denyRead=false;
$write=runAgent(array('folder'=>'','name'=>'2026年费用.md','indexed_path'=>$indexed,
    'instructions'=>'修改文档'),'prepare_edit');
check($write->getCode()===400 && strpos($write->getMessage(),'不支持的参数字段')!==false,
    'untrusted indexed_path cannot be used with document mutation tools');
echo "OK: RAG indexed read is bound to KodBox permissions and exact source names\n";
