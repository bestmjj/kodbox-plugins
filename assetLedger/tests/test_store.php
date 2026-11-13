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
    $saved['wallosId']='42';$saved['notes']='再次修改';
    $saved['wallosRef']='旧版续费文本';$saved['vaultRef']='Bitwarden 中的 VPS 管理条目';
    $saved['vaultUrl']='https://vault.example.net/#/vault?itemId=00000000-1111-2222-3333-444444444444';
    $new=$store->save($saved);
    ok($new['vaultUrl']===$saved['vaultUrl'] && $new['vaultRef']===$saved['vaultRef'], 'Bitwarden item name and direct URL persisted');
    ok($new['wallosRef']==='旧版续费文本' && $new['wallosId']==='42','legacy Wallos note preserved alongside subscription ID');
    $minimal=$store->save(array('id'=>$new['id'],'name'=>$new['name'],'type'=>$new['type']));
    ok($minimal['wallosRef']==='旧版续费文本' && $minimal['vaultUrl']===$saved['vaultUrl'], 'existing references survive partial record updates');
    $badVault=$new; $badVault['vaultUrl']='javascript:alert(1)';
    $invalidVault=false;try{$store->save($badVault);}catch(InvalidArgumentException $e){$invalidVault=true;}
    ok($invalidVault,'reject unsafe Bitwarden URL schemes');
    ok($new['wallosId']==='42','Wallos subscription ID persisted');
    $copy=$new; $copy['id']=''; $copy['name']='自定义实例 - 副本'; $copy['wallosId']=''; $copy['relations']=array();
    $duplicated=$store->save($copy);
    ok($duplicated['id']!==$new['id'] && $duplicated['name']!==$new['name'],'duplicate creates distinct asset ID');
    ok($store->all()['records'][0]['name']!=='' && $store->all()['records'][0]['type']!=='','original assets remain after duplicate');
    $store->remove($duplicated['id']);
    $invalid=false;try{$new['wallosId']='not-a-number';$store->save($new);}catch(InvalidArgumentException $e){$invalid=true;}
    ok($invalid,'reject invalid Wallos subscription ID');
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
