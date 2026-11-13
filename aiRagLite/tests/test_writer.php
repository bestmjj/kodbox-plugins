<?php
error_reporting(E_ALL);
define('REPEAT_RENAME',2);
class Session {public static function get($key){return $key==='kodUser.sourceInfo.sourceID'?1001:null;}}
class KodIO {
    public static function make($id){return '{source:'.$id.'}';}
    public static function clear($path){return $path;}
}
class AuthStub {public function fileCan($path,$action){return $action==='show'||$action==='edit';}}
class ListStub {
    public function path($path){
        $rows=array();
        foreach (IO::$children[$path] ?? array() as $name=>$item) $rows[]=array('name'=>$name,'path'=>$item);
        return array('folderList'=>$rows);
    }
}
function Action($key){return $key==='explorer.list'?new ListStub():new AuthStub();}
class IO {
    public static $paths=array('{source:1001}'=>array('type'=>'folder'),
                               '{source:project}'=>array('type'=>'folder'));
    public static $children=array('{source:1001}'=>array('项目'=>'{source:project}'));
    public static $content=array();
    public static function info($path){return self::$paths[$path]??false;}
    public static function mkdir($path){
        self::$paths[$path]=array('type'=>'folder');
        self::$children['{source:1001}']['AI草稿']=$path;
        return $path;
    }
    public static function mkfile($path,$bytes,$repeat){
        if(isset(self::$paths[$path])) throw new RuntimeException('overwrite');
        self::$paths[$path]=array('type'=>'file');self::$content[$path]=$bytes;return $path;
    }
    public static function getLastError($default=''){return $default;}
}
require dirname(__DIR__).'/lib/DocumentWriter.php';
function ok($test,$label){if(!$test)throw new RuntimeException('FAIL '.$label);}
ok(AiRagLiteDocumentWriter::cleanTitle(' ../danger / test ')==='danger test','sanitize');
$listing=AiRagLiteDocumentWriter::listFolders('');
ok($listing['folders'][0]['folder']==='项目','folder list');
$first=AiRagLiteDocumentWriter::save('项目报告','# 标题','md','','');
ok(strpos($first['path'],'{source:1001}/AI草稿/')===0,'default directory');
ok(IO::$content[$first['path']]==='# 标题','preserve content');
$second=AiRagLiteDocumentWriter::save('项目报告','新正文','md','','','项目');
ok(strpos($second['path'],'{source:project}/')===0,'selected folder');
ok($first['path']!==AiRagLiteDocumentWriter::save('项目报告','正文','md','','')['path'],'never overwrite');
foreach(array('../x','/tmp','项目/../x','项目//x') as $bad){
    try{AiRagLiteDocumentWriter::resolveFolder($bad);throw new RuntimeException('bad path accepted');}
    catch(RuntimeException $e){ok(strpos($e->getMessage(),'路径')!==false || strpos($e->getMessage(),'目录')!==false,'reject traversal');}
}
echo "OK: current-user document writer\n";
