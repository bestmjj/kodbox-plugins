<?php
/** CLI-only smoke test. Usage: php tests/test_store.php /path/to/starter.json */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once(__DIR__.'/../lib/AssetLedgerStore.php');
function ok($value,$message){if(!$value){fwrite(STDERR,"FAIL: $message\n");exit(1);}echo "PASS: $message\n";}
$dir = sys_get_temp_dir().'/assetLedger_test_'.bin2hex(random_bytes(5)).'/';
$store=new AssetLedgerStore($dir);
try {
    $initial=$store->all();
    ok($initial['schemaVersion']===1&&count($initial['records'])===0,'empty store / schema');
    ok(count($initial['types'])===11,'builtin asset types');
    $fixture=$argc>1?json_decode(file_get_contents($argv[1]),true):null;
    if($fixture){
        $imported=$store->import($fixture);
        ok($imported['added']===count($fixture['records']),'bulk import');
        ok(count($store->all()['records'])===count($fixture['records']),'imported records readable');
        $again=$store->import($fixture);
        ok($again['added']===0 && $again['skipped']===count($fixture['records']),'idempotent merge import');
        $allRecords = $store->all()['records'];
        $matches = array_values(array_filter($allRecords,function($r){return $r['id']==='s_netcup';}));
        $netcup = $matches[0];
        ok($netcup['name']==='Netcup VPS' && in_array('w_pdf',$netcup['relations'],true),'related assets preserved');
    }
    $type=$store->addType('云数据库');
    ok(strpos($type['id'],'custom_')===0,'new custom category');
    $saved=$store->save(array('name'=>'自定义实例','type'=>$type['id'],'state'=>'draft','attrs'=>array('内存'=>'2 GiB'),'relations'=>array('s_netcup')));
    ok($saved['name']==='自定义实例' && $saved['attrs']['内存']==='2 GiB','new record, custom fields');
    $saved['notes']='再次修改';$new=$store->save($saved);
    ok($new['id']===$saved['id']&&$new['notes']==='再次修改','update maintains ID');
    $failed=false;try{$store->removeType($type['id']);}catch(Exception $e){$failed=true;}
    ok($failed,'cannot remove a category containing records');
    $store->remove($saved['id']);$store->removeType($type['id']);
    ok(!array_filter($store->all()['types'],function($t)use($type){return $t['id']===$type['id'];}),'remove empty custom category');
    ok(strncmp(file_get_contents($dir.'data.php'),'<?php',5)===0,'data file PHP guard');
    $bad=false;try{$store->import(array('schemaVersion'=>999,'records'=>array()));}catch(Exception $e){$bad=true;}
    ok($bad,'reject unsupported schema version');
    echo "ALL TESTS PASSED\n";
}finally{
    foreach(glob($dir.'*') as $f)@unlink($f);
    @rmdir($dir);
}
