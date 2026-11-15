<?php
require_once(__DIR__.'/../lib/IndexedFileLocator.php');
function check($value,$message) {
    if (!$value) throw new RuntimeException('FAIL: '.$message);
}
$hits=array('results'=>array(
    array('name'=>'其他教程.md','path'=>'与我协作/用户[admin]/我的文档/其他教程.md',
          'snippet'=>'关于短视频流程的补充材料','location'=>'第2行'),
    array('name'=>'萌宠短视频流程.md','path'=>'与我协作/用户[admin]/我的文档/学习/短视频/萌宠短视频流程.md',
          'snippet'=>'# 短视频流程','location'=>'第1行'),
    array('name'=>'萌宠短视频流程.md','path'=>'与我协作/用户[admin]/我的文档/学习/短视频/萌宠短视频流程.md',
          'snippet'=>'同一文件的另一个片段','location'=>'第100行'),
    array('name'=>'无关文档.md','path'=>'与我协作/用户[admin]/我的文档/无关文档.md',
          'snippet'=>'没有提到主题','location'=>'第1行'),
));
$ranked=AiRagLiteIndexedFileLocator::rank($hits,'短视频流程',8);
check($ranked['count']===3,'deduplicate indexed chunks');
check($ranked['results'][0]['name']==='萌宠短视频流程.md','file title outranks incidental snippet');
check(strpos($ranked['results'][0]['path'],'学习/短视频/')!==false,'retain exact WebDAV indexed source path');
check($ranked['results'][1]['name']==='其他教程.md','snippet match after filename match');
check(!isset($ranked['results'][0]['score']),'internal ranking metadata not exposed');
check($ranked['indexed_only']===true,'results never claim a live file permission check');
$empty=AiRagLiteIndexedFileLocator::rank(array('results'=>array()),'没有的文件');
check($empty['count']===0,'unindexed file search empty is not a false filesystem claim');
$bad=AiRagLiteIndexedFileLocator::rank(array('results'=>array(
    array('name'=>'invalid','path'=>''),
    array('name'=>'valid','path'=>'a.md')
)),'valid');
check($bad['count']===1,'reject empty indexed paths');
echo "OK: indexed file locator ranking, deduplication, no permission overclaim\n";
