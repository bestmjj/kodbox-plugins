<?php
/** Regression tests for bidirectional relations, stale references and imports. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once __DIR__ . '/../lib/AssetLedgerStore.php';

function assertLink($condition, $label) {
    if (!$condition) { fwrite(STDERR, "FAIL: " . $label . "\n"); exit(1); }
    echo "PASS: " . $label . "\n";
}
function rowById($store, $id) {
    foreach ($store->all()['records'] as $record) {
        if ($record['id'] === $id) return $record;
    }
    throw new RuntimeException('Missing asset ' . $id);
}
function hasLink($store, $source, $target) {
    $item = rowById($store, $source);
    return in_array($target, $item['relations'], true);
}
$dir = sys_get_temp_dir() . '/assetledger_relation_test_' . bin2hex(random_bytes(6)) . '/';
$store = new AssetLedgerStore($dir);
try {
    $a = $store->save(array('name'=>'Nuyek VPS','type'=>'server','notes'=>'Do not overwrite'));
    $b = $store->save(array('name'=>'Reelay Telegram','type'=>'service'));
    $a['relations'] = array($b['id']);
    $store->save($a);
    assertLink(hasLink($store,$a['id'],$b['id']) && hasLink($store,$b['id'],$a['id']), 'Add from A is visible from B');
    $b = rowById($store,$b['id']);
    $b['relations'] = array();
    $store->save($b);
    assertLink(!hasLink($store,$a['id'],$b['id']) && !hasLink($store,$b['id'],$a['id']), 'Remove from B removes both directions');
    $b['relations'] = array($a['id']);
    $store->save($b);
    assertLink(hasLink($store,$a['id'],$b['id']) && hasLink($store,$b['id'],$a['id']), 'Add from B is visible from A');
    $a = rowById($store,$a['id']);
    $a['relations'] = array();
    $store->save($a);
    assertLink(!hasLink($store,$a['id'],$b['id']) && !hasLink($store,$b['id'],$a['id']), 'Remove from A removes both directions');
    assertLink(rowById($store,$a['id'])['notes'] === 'Do not overwrite', 'Linked changes preserve unrelated asset fields');

    // Simulate v1.1.1 on-disk data where only one side stores the link.
    $legacy = $store->all();
    foreach ($legacy['records'] as &$row) {
        if ($row['id'] === $a['id']) $row['relations'] = array();
        if ($row['id'] === $b['id']) $row['relations'] = array($a['id']);
    }
    unset($row);
    file_put_contents($dir . 'data.php', AssetLedgerStore::PREFIX . json_encode($legacy));
    assertLink(!hasLink($store,$a['id'],$b['id']) && hasLink($store,$b['id'],$a['id']), 'Simulated old inbound-only reference');
    $store->save(array('id'=>$a['id'],'type'=>'server','name'=>'Nuyek VPS','relations'=>array()));
    assertLink(!hasLink($store,$a['id'],$b['id']) && !hasLink($store,$b['id'],$a['id']), 'Explicit empty relations delete the old inbound-only reference');

    file_put_contents($dir . 'data.php', AssetLedgerStore::PREFIX . json_encode($legacy));
    $store->save(array('id'=>$a['id'],'type'=>'server','name'=>'Nuyek VPS','notes'=>'Safe partial update'));
    assertLink(hasLink($store,$a['id'],$b['id']) && hasLink($store,$b['id'],$a['id']), 'Partial update preserves and heals old inbound-only reference');

    $incoming = array('schemaVersion'=>1,'records'=>array(
        array('id'=>'import_alpha','name'=>'Website A','type'=>'website','relations'=>array('import_beta')),
        array('id'=>'import_beta','name'=>'Server B','type'=>'server','relations'=>array())
    ));
    $imported = $store->import($incoming);
    assertLink($imported['added']===2,'Import new related assets');
    assertLink(hasLink($store,'import_alpha','import_beta') && hasLink($store,'import_beta','import_alpha'),'Import repairs reverse relationships');
    $store->remove('import_alpha');
    assertLink(!in_array('import_alpha',rowById($store,'import_beta')['relations'],true),'Deleting a record cleans peer relations');
    assertLink($store->all()['schemaVersion']===1,'Backward-compatible schemaVersion');

    echo "RELATION TESTS PASSED\n";
} finally {
    foreach (glob($dir . '*') as $item) @unlink($item);
    @rmdir($dir);
}
