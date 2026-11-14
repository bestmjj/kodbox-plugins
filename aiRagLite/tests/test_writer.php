<?php
error_reporting(E_ALL);
define('REPEAT_RENAME',2);
class Session {public static function get($key){return $key==='kodUser.sourceInfo.sourceID'?1001:null;}}
class KodIO {
    public static function make($id){return '{source:'.$id.'}';}
    public static function clear($path){return $path;}
}
class AuthStub {public function fileCan($path,$action){return in_array($action,array('show','view','edit'),true);}}
class ListStub {
    public function path($path){
        $rows=array();
        foreach (IO::$children[$path] ?? array() as $name=>$item) $rows[]=array('name'=>$name,'path'=>$item);
        $files=array();
        foreach(IO::$content as $filePath=>$body){
            if(strrpos($filePath,rtrim($path,'/').'/')!==0) continue;
            $name=substr($filePath,strlen(rtrim($path,'/').'/'));
            if($name==='' || strpos($name,'/')!==false)continue;
            $files[]=array('name'=>$name,'path'=>$filePath,'size'=>strlen($body),'type'=>'file');
        }
        return array('folderList'=>$rows,'fileList'=>$files);
    }
}
function Action($key){return $key==='explorer.list'?new ListStub():new AuthStub();}
class IO {
    public static $paths=array('{source:1001}'=>array('type'=>'folder'),
                               '{source:project}'=>array('type'=>'folder'));
    public static $children=array('{source:1001}'=>array('项目'=>'{source:project}'));
    public static $content=array();
    public static $phantomAncestorInfo=false;
    public static $lastRepeat=null;
    public static function info($path){
        if(isset(self::$paths[$path])) return self::$paths[$path];
        // Reproduce KodBox virtual source behavior: the missing child can
        // resolve to a truthy parent folder, not an actual existing file.
        if(self::$phantomAncestorInfo && strpos($path,'{source:project}/')===0)
            return array('type'=>'folder','path'=>'{source:project}');
        return false;
    }
    public static function mkdir($path){
        self::$paths[$path]=array('type'=>'folder');
        self::$children['{source:1001}']['AI草稿']=$path;
        return $path;
    }
    public static function mkfile($path,$bytes,$repeat){
        self::$lastRepeat=$repeat;
        if($repeat!==REPEAT_RENAME) throw new RuntimeException('Unsafe overwrite policy');
        if(isset(self::$paths[$path])) throw new RuntimeException('overwrite');
        self::$paths[$path]=array('type'=>'file');self::$content[$path]=$bytes;return $path;
    }
    public static function getContent($path){return self::$content[$path]??false;}
    public static function setContent($path,$content){
        if(!array_key_exists($path,self::$content))return false;
        self::$content[$path]=$content;
        return true;
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
// A regression of the real incident: the target directory is empty, yet
// IO::info(nonexistent-child) may return the ancestor. Creation must proceed.
IO::$phantomAncestorInfo=true;
$third=AiRagLiteDocumentWriter::save('短视频流程','# 新方案','md','','','项目');
ok(strpos($third['path'],'{source:project}/')===0,'source virtual path saved');
ok(IO::$content[$third['path']]==='# 新方案','created despite phantom ancestor info');
ok(IO::$lastRepeat===REPEAT_RENAME,'safe rename collision policy');
IO::$phantomAncestorInfo=false;
$name=basename($third['path']);
$loaded=AiRagLiteDocumentWriter::readDocument('项目',$name,'','');
ok($loaded['content']==='# 新方案','load existing document');
ok($loaded['hash']===hash('sha256','# 新方案'),'hash of loaded original');
ok($loaded['folder']==='项目','source folder retained');
// A stale expected hash must never update the source.
try{
    AiRagLiteDocumentWriter::overwriteDocument('项目',$name,str_repeat('0',64),'# 应该拒绝');
    throw new RuntimeException('stale hash accepted');
}catch(RuntimeException $e){ok(strpos($e->getMessage(),'修改')!==false || strpos($e->getMessage(),'变化')!==false,'stale hash rejected');}
ok(IO::$content[$third['path']]==='# 新方案','source unchanged on stale hash');
$updated=AiRagLiteDocumentWriter::overwriteDocument('项目',$name,$loaded['hash'],'# 正确修改');
ok(IO::$content[$third['path']]==='# 正确修改','existing document updated');
ok(isset($updated['backup']) && IO::$content['{source:project}/'.$updated['backup']]==='# 新方案','backup contains previous version');
ok($updated['hash']===hash('sha256','# 正确修改'),'updated hash returned');
try {
    AiRagLiteDocumentWriter::overwriteDocument('项目','危险.docx',$loaded['hash'],'覆盖Word');
    throw new RuntimeException('Word overwrite accepted');
}catch(RuntimeException $e){ok(strpos($e->getMessage(),'Word')!==false,'Word overwrite forbidden');}
try {
    AiRagLiteDocumentWriter::readDocument('项目','../other.md','','');
    throw new RuntimeException('traversal accepted');
}catch(RuntimeException $e){ok(strpos($e->getMessage(),'支持')!==false,'file name traversal rejected');}
foreach(array('../x','/tmp','项目/../x','项目//x') as $bad){
    try{AiRagLiteDocumentWriter::resolveFolder($bad);throw new RuntimeException('bad path accepted');}
    catch(RuntimeException $e){ok(strpos($e->getMessage(),'路径')!==false || strpos($e->getMessage(),'目录')!==false,'reject traversal');}
}
echo "OK: current-user document writer\n";
