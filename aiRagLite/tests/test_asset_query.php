<?php
/** Read-only fixture tests: no Kodbox instance or RAG service required. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../lib/AssetLedgerQuery.php';

function checkAssetQuery($cond, $label) {
    if (!$cond) { fwrite(STDERR, "FAIL: ".$label."\n"); exit(1); }
    echo "PASS: ".$label."\n";
}
$data = array(
    'schemaVersion'=>1,
    'types'=>array(
        array('id'=>'server','name'=>'服务器 / VPS'),
        array('id'=>'service','name'=>'应用 / Docker 服务'),
        array('id'=>'website','name'=>'网站 / 产品')
    ),
    'records'=>array(
        array('id'=>'s_nuyek','name'=>'Nuyek 独立服务器','type'=>'server','state'=>'active','verification'=>'confirmed','provider'=>'Nuyek','relations'=>array('svc_reelay'),'notes'=>'PASSWORD_NEVER_SHOW'),
        array('id'=>'svc_reelay','name'=>'Reelay Telegram 订阅与转存','type'=>'service','state'=>'active','verification'=>'needs_review','relations'=>array(),'vaultUrl'=>'https://vault.example/item/secret'),
        array('id'=>'w_pdf','name'=>'PDF Tools','type'=>'website','state'=>'active','verification'=>'confirmed','relations'=>array(),'loginHint'=>'PRIVATE_USERNAME')
    )
);
checkAssetQuery(AiRagLiteAssetQuery::wantsAssets('我的数字资产有哪些', $data), 'Automatic route for explicit asset query');
checkAssetQuery(AiRagLiteAssetQuery::wantsAssets('Nuyek 上有什么服务', $data), 'Automatic route for named known server');
checkAssetQuery(!AiRagLiteAssetQuery::wantsAssets('数据安全产品手册', $data), 'Document query stays on RAG path');
$overview=AiRagLiteAssetQuery::run('我的数字资产有哪些', $data);
checkAssetQuery($overview['sourceType']==='assets' && $overview['total']===3, 'Overview reads actual inventory count');
checkAssetQuery(strpos($overview['answer'], '服务器 / VPS')!==false, 'Overview groups asset types');
$impact=AiRagLiteAssetQuery::run('我准备下线 Nuyek 独立服务器，有什么影响？', $data);
checkAssetQuery(strpos($impact['answer'], 'Reelay Telegram')!==false, 'Impact query shows reverse-safe related service');
checkAssetQuery(strpos($impact['answer'], '并非真实部署依赖验证')!==false, 'Impact query avoids unsupported dependency claims');
$audit=AiRagLiteAssetQuery::run('哪些资产待核实', $data);
checkAssetQuery(strpos($audit['answer'], '待核实 **1**')!==false, 'Audit query counts unverified assets');
foreach (array($overview,$impact,$audit) as $result) {
    $serialized=json_encode($result);
    checkAssetQuery(strpos($serialized, 'PASSWORD_NEVER_SHOW')===false &&
        strpos($serialized,'PRIVATE_USERNAME')===false &&
        strpos($serialized,'vault.example')===false, 'No secret-like fields leave store adapter');
}
checkAssetQuery(AiRagLiteAssetQuery::run('我的数字资产', array('types'=>array(),'records'=>array()))['total']===0, 'Empty inventory handled');
echo "ASSET RAG BRIDGE TESTS PASSED\n";
