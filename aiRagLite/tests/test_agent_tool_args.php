<?php
/** Safe argument-shape regression tests; no KodBox, private data or RAG calls. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

class PluginBase {
    public function __construct() {}
    public function getConfig() {
        return array('serviceUrl'=>'http://rag-api:8787','serviceKey'=>'test-only');
    }
}
class KodUser { public static function checkRoot() {} }
class Input {
    public static $values=array();
    public static function get($key) { return self::$values[$key] ?? null; }
}
class TestResponse extends RuntimeException {}
function show_json($message,$success=true) {
    throw new TestResponse((string)$message, $success ? 200 : 400);
}
$_SERVER['REQUEST_METHOD']='POST';
require_once __DIR__.'/../app.php';

function resultFor($tool,$arguments) {
    Input::$values=array('tool'=>$tool,'arguments_json'=>$arguments);
    try { (new aiRagLitePlugin())->agentTool(); }
    catch (TestResponse $ex) { return $ex->getMessage(); }
    throw new RuntimeException('Agent tool unexpectedly returned without a response');
}
function checkAgent($condition,$name) {
    if (!$condition) {fwrite(STDERR, "FAIL: ".$name."\n");exit(1);}
    echo "PASS: ".$name."\n";
}

// An intentionally one-character query makes execution stop in validation,
// proving that the argument parser accepted the decoded query first.
$readSearch=json_encode(array('query'=>'x','limit'=>8,'source'=>'index','path'=>''));
$reply=resultFor('find_files',$readSearch);
checkAgent(strpos($reply,'文件查询词过短或过长')!==false,
    'extra read-only model args ignored, never sent to search');
$wrapped=json_encode(json_encode(array('query'=>'x')));
$reply=resultFor('find_files',$wrapped);
checkAgent(strpos($reply,'文件查询词过短或过长')!==false,
    'double encoded JSON string unwrapped exactly once');
$reply=resultFor('find_files',json_encode(array('q'=>'x','limit'=>3)));
checkAgent(strpos($reply,'文件查询词过短或过长')!==false,
    'read-only q alias normalized to query');
$reply=resultFor('find_files',json_encode(array('limit'=>4)));
checkAgent(strpos($reply,'缺少有效 query')!==false,
    'missing required query safely rejected');
$reply=resultFor('prepare_edit',json_encode(array(
    'folder'=>'','name'=>'sample.md','instructions'=>'edit','shell'=>'rm')));
checkAgent(strpos($reply,'不支持的参数字段')!==false,
    'write-capable tool rejects unknown model fields');
$reply=resultFor('find_files','not json');
checkAgent(strpos($reply,'有效 JSON 对象')!==false,
    'invalid JSON rejected without retry');
echo "OK: Agent argument validation regression tests\n";
