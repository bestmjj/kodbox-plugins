<?php
/**
 * Wallos v5.x read-only API bridge.
 * Credentials stay on the Kodbox server (outside plugins and asset JSON).
 * Remote API calls are POST requests so the API key is not placed in URLs.
 */
class AssetLedgerWallos {
    const PREFIX = "<?php http_response_code(404); exit; ?>\n";
    private $dir;
    private $file;

    public function __construct($dir) {
        $this->dir = rtrim($dir, '/\\') . DIRECTORY_SEPARATOR;
        $this->file = $this->dir . 'wallos-config.php';
        if (!is_dir($this->dir) && !@mkdir($this->dir, 0700, true) && !is_dir($this->dir)) {
            throw new RuntimeException('无法创建 Wallos 配置目录');
        }
        @chmod($this->dir, 0700);
    }

    public static function normalizeUrl($url) {
        $url = rtrim(trim((string)$url), '/');
        if (strlen($url) > 400 || !$url || preg_match('/[\x00-\x20\x7f]/', $url)) {
            throw new InvalidArgumentException('请输入有效的 Wallos 服务地址');
        }
        $parsed = parse_url($url);
        if (!is_array($parsed) || !isset($parsed['scheme'], $parsed['host']) ||
            !in_array(strtolower($parsed['scheme']), array('http', 'https'), true) ||
            isset($parsed['user']) || isset($parsed['pass']) ||
            isset($parsed['query']) || isset($parsed['fragment']) ||
            empty($parsed['host'])) {
            throw new InvalidArgumentException('Wallos 地址必须是 http(s)://主机[:端口][/路径]，不可包含账号或参数');
        }
        return $url;
    }

    private function readSecret() {
        if (!file_exists($this->file)) return array('url'=>'', 'apiKey'=>'');
        $raw = @file_get_contents($this->file);
        if (!is_string($raw) || strncmp($raw, self::PREFIX, strlen(self::PREFIX)) !== 0) {
            throw new RuntimeException('Wallos 配置损坏，请检查备份');
        }
        $cfg = json_decode(substr($raw, strlen(self::PREFIX)), true);
        if (!is_array($cfg)) throw new RuntimeException('Wallos 配置 JSON 无效');
        return array(
            'url' => isset($cfg['url']) ? (string)$cfg['url'] : '',
            'apiKey' => isset($cfg['apiKey']) ? (string)$cfg['apiKey'] : ''
        );
    }

    public function getPublicConfig() {
        $cfg = $this->readSecret();
        return array('url'=>$cfg['url'], 'configured'=>!!($cfg['url'] && $cfg['apiKey']));
    }

    public function saveConfig($url, $apiKey='') {
        $url = self::normalizeUrl($url);
        $old = $this->readSecret();
        $apiKey = trim((string)$apiKey);
        if (!$apiKey) $apiKey = $old['apiKey'];
        if (!$apiKey || strlen($apiKey) > 256 || preg_match('/[\r\n]/', $apiKey)) {
            throw new InvalidArgumentException('请填写有效的 Wallos API Key（留空表示保留已保存的 Key）');
        }
        $content = self::PREFIX . json_encode(array('url'=>$url, 'apiKey'=>$apiKey), JSON_UNESCAPED_SLASHES);
        $tmp = $this->dir . 'wallos-' . bin2hex(random_bytes(8)) . '.tmp';
        if (@file_put_contents($tmp, $content, LOCK_EX) === false) {
            throw new RuntimeException('无法写入 Wallos 配置');
        }
        @chmod($tmp, 0600);
        if (!@rename($tmp, $this->file)) {
            @unlink($tmp);
            throw new RuntimeException('保存 Wallos 配置失败');
        }
        @chmod($this->file, 0600);
        return $this->getPublicConfig();
    }

    public function clearConfig() {
        if (file_exists($this->file) && !@unlink($this->file)) {
            throw new RuntimeException('清除 Wallos 配置失败');
        }
        return array('url'=>'', 'configured'=>false);
    }

    private function request($path, $cfg) {
        if (!function_exists('curl_init')) {
            throw new RuntimeException('Kodbox PHP 缺少 cURL 扩展');
        }
        // Only call fixed, audited Wallos API paths; do not accept a path from clients.
        if (!in_array($path, array(
            '/api/subscriptions/get_subscriptions.php',
            '/api/currencies/get_currencies.php'
        ), true)) throw new InvalidArgumentException('不允许的 Wallos 接口');

        $ch = curl_init($cfg['url'] . $path);
        if (!$ch) throw new RuntimeException('无法初始化 Wallos 连接');
        $body = '';
        $tooLarge = false;
        curl_setopt_array($ch, array(
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query(array('api_key'=>$cfg['apiKey'])),
            CURLOPT_HTTPHEADER => array('Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'),
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 12,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_USERAGENT => 'Kodbox-AssetLedger/1.1',
            CURLOPT_WRITEFUNCTION => function($handle, $chunk) use (&$body, &$tooLarge) {
                if (strlen($body) + strlen($chunk) > 3 * 1024 * 1024) {
                    $tooLarge = true;
                    return 0;
                }
                $body .= $chunk;
                return strlen($chunk);
            }
        ));
        if (defined('CURLOPT_PROTOCOLS_STR')) {
            curl_setopt($ch, CURLOPT_PROTOCOLS_STR, 'http,https');
        } elseif (defined('CURLOPT_PROTOCOLS')) {
            curl_setopt($ch, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS);
        }
        $ok = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($tooLarge) throw new RuntimeException('Wallos 返回数据超过 3 MiB');
        if (!$ok || $status < 200 || $status >= 300) {
            throw new RuntimeException('Wallos 请求失败（HTTP ' . intval($status) . '），请检查 Kodbox 到 Wallos 的网络和地址');
        }
        $data = json_decode($body, true);
        if (!is_array($data) || empty($data['success'])) {
            $msg = is_array($data) && isset($data['title']) && is_string($data['title']) ? $data['title'] : '无效 JSON 或 API 返回错误';
            throw new RuntimeException('Wallos API：' . substr($msg, 0, 160));
        }
        return $data;
    }

    public function listSubscriptions() {
        $cfg = $this->readSecret();
        if (!$cfg['url'] || !$cfg['apiKey']) throw new RuntimeException('请先在 Wallos 设置中配置地址和 API Key');
        $data = $this->request('/api/subscriptions/get_subscriptions.php', $cfg);
        if (!isset($data['subscriptions']) || !is_array($data['subscriptions'])) {
            throw new RuntimeException('Wallos 返回值缺少 subscriptions 数组');
        }
        $codes = array();
        // If currency lookup fails, subscriptions are still usable.
        try {
            $cur = $this->request('/api/currencies/get_currencies.php', $cfg);
            if (isset($cur['currencies']) && is_array($cur['currencies'])) {
                foreach ($cur['currencies'] as $c) {
                    if (isset($c['id'], $c['code'])) $codes[(string)$c['id']] = (string)$c['code'];
                }
            }
        } catch (Exception $ignore) {}
        $out = array();
        foreach (array_slice($data['subscriptions'], 0, 3000) as $s) {
            if (!is_array($s) || !isset($s['id'])) continue;
            $id = (string)$s['id'];
            if (!preg_match('/^[0-9]{1,12}$/D', $id)) continue;
            $out[] = array(
                'id'=>$id,
                'name'=>substr((string)($s['name'] ?? ''), 0, 200),
                'price'=>is_scalar($s['price'] ?? null) ? (string)$s['price'] : '',
                'currency'=>isset($codes[(string)($s['currency_id'] ?? '')]) ? $codes[(string)$s['currency_id']] : '',
                'currencyId'=>isset($s['currency_id']) ? (string)$s['currency_id'] : '',
                'nextPayment'=>substr((string)($s['next_payment'] ?? ''), 0, 32),
                'inactive'=>!empty($s['inactive']),
                'cycle'=>isset($s['cycle']) ? (string)$s['cycle'] : '',
                'frequency'=>isset($s['frequency']) ? (string)$s['frequency'] : ''
            );
        }
        return array('subscriptions'=>$out);
    }
}
