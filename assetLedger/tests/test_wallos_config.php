<?php
/** Local, no-network smoke tests for Wallos configuration security. */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once(__DIR__ . '/../lib/AssetLedgerWallos.php');
function checkWallos($ok, $name) {
    if (!$ok) { fwrite(STDERR, 'FAIL: '.$name."\n"); exit(1); }
    echo 'PASS: '.$name."\n";
}
$dir = sys_get_temp_dir() . '/assetLedger_wallos_test_' . bin2hex(random_bytes(5));
$client = new AssetLedgerWallos($dir);
try {
    checkWallos(AssetLedgerWallos::normalizeUrl('http://wallos:8282/')==='http://wallos:8282', 'Docker internal URL accepted');
    checkWallos(AssetLedgerWallos::normalizeUrl('https://example.com/wallos')==='https://example.com/wallos', 'HTTPS subpath URL accepted');
    foreach (array('file:///etc/passwd', 'http://example.com/?api_key=secret', 'http://me:pass@example.com', 'https://example.com/a b') as $bad) {
        $rejected=false;try{AssetLedgerWallos::normalizeUrl($bad);}catch(InvalidArgumentException $e){$rejected=true;}
        checkWallos($rejected,'unsafe URL rejected');
    }
    $public=$client->saveConfig('http://wallos:8282', 'dummy-test-key');
    checkWallos($public['configured'] && !isset($public['apiKey']), 'save config never returns key');
    $raw=file_get_contents($dir.'/wallos-config.php');
    checkWallos(strncmp($raw,'<?php',5)===0, 'secret file has PHP execution guard');
    checkWallos(strpos(json_encode($public), 'dummy-test-key')===false, 'public response excludes key');
    $public=$client->saveConfig('http://wallos:8282', '');
    checkWallos($public['configured'], 'blank key keeps previous key');
    $cleared=$client->clearConfig();
    checkWallos(!$cleared['configured'] && !file_exists($dir.'/wallos-config.php'), 'clear removes saved credentials');
    echo "WALLOS CONFIG TESTS PASSED\n";
} finally {
    foreach (glob($dir.'/*') as $f) @unlink($f);
    @rmdir($dir);
}
