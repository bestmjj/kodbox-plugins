<?php
/**
 * AssetLedgerStore: JSON-backed, schema-versioned, admin-only asset register.
 * No additional database service required. All mutations serialized with flock.
 * Storage is under Kodbox USER_SYSTEM, outside plugin directory so upgrades do
 * not overwrite data. PHP header prevents accidental direct HTTP disclosure.
 */
class AssetLedgerStore {
    const SCHEMA_VERSION = 1;
    const MAX_RECORDS = 3000;
    const MAX_IMPORT_BYTES = 2097152;
    const PREFIX = "<?php http_response_code(404); exit; ?>\n";

    private $dir;
    private $file;
    private $lockFile;

    public function __construct($dir) {
        $this->dir = rtrim($dir, '/\\') . DIRECTORY_SEPARATOR;
        $this->file = $this->dir . 'data.php';
        $this->lockFile = $this->dir . 'write.lock';
        if (!is_dir($this->dir) && !@mkdir($this->dir, 0700, true) && !is_dir($this->dir)) {
            throw new RuntimeException('无法创建资产数据目录，请检查 Kodbox data/system 的写权限');
        }
        @chmod($this->dir, 0700);
    }

    public static function defaults() {
        return array(
            array('id'=>'server', 'name'=>'服务器 / VPS', 'icon'=>'server'),
            array('id'=>'device', 'name'=>'本地设备', 'icon'=>'monitor'),
            array('id'=>'network', 'name'=>'网络 / 基础设施', 'icon'=>'network'),
            array('id'=>'domain', 'name'=>'域名 / 子域名', 'icon'=>'globe'),
            array('id'=>'website', 'name'=>'网站 / 产品', 'icon'=>'globe-2'),
            array('id'=>'service', 'name'=>'应用 / Docker 服务', 'icon'=>'layers'),
            array('id'=>'project', 'name'=>'代码 / 项目', 'icon'=>'code'),
            array('id'=>'account', 'name'=>'平台 / 账号', 'icon'=>'user'),
            array('id'=>'entitlement', 'name'=>'额度 / 许可证 / 权益', 'icon'=>'ticket'),
            array('id'=>'document', 'name'=>'资料 / 文档', 'icon'=>'file-text'),
            array('id'=>'other', 'name'=>'其他资产', 'icon'=>'box')
        );
    }

    public static function emptyData() {
        return array('schemaVersion'=>self::SCHEMA_VERSION, 'types'=>self::defaults(), 'records'=>array());
    }

    private function withLock($exclusive, $callback) {
        $handle = @fopen($this->lockFile, 'c+');
        if (!$handle) throw new RuntimeException('无法打开写入锁文件');
        @chmod($this->lockFile, 0600);
        try {
            if (!flock($handle, $exclusive ? LOCK_EX : LOCK_SH)) {
                throw new RuntimeException('资产数据正在被其他操作占用');
            }
            $data = $this->readUnsafe();
            $result = call_user_func_array($callback, array(&$data));
            if ($exclusive) $this->writeUnsafe($data);
            flock($handle, LOCK_UN);
            return $result;
        } finally {
            fclose($handle);
        }
    }

    private function readUnsafe() {
        if (!file_exists($this->file)) return self::emptyData();
        $raw = @file_get_contents($this->file);
        if ($raw === false || strncmp($raw, self::PREFIX, strlen(self::PREFIX)) !== 0) {
            throw new RuntimeException('资产数据文件格式异常，请从备份恢复，不会自动覆盖');
        }
        $value = json_decode(substr($raw, strlen(self::PREFIX)), true);
        if (!is_array($value) || !isset($value['schemaVersion']) ||
            (int)$value['schemaVersion'] !== self::SCHEMA_VERSION ||
            !isset($value['types']) || !is_array($value['types']) ||
            !isset($value['records']) || !is_array($value['records'])) {
            throw new RuntimeException('数据版本不兼容或内容损坏；为避免丢失数据已停止写入');
        }
        return $value;
    }

    private function writeUnsafe($data) {
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) throw new RuntimeException('JSON 编码失败，修改未保存');
        $temp = $this->dir . 'write-' . bin2hex(random_bytes(8)) . '.tmp';
        if (@file_put_contents($temp, self::PREFIX . $json) === false) {
            throw new RuntimeException('写入临时文件失败，请检查磁盘空间和目录权限');
        }
        @chmod($temp, 0600);
        if (!@rename($temp, $this->file)) {
            @unlink($temp);
            throw new RuntimeException('提交数据失败，请检查目录写权限');
        }
        @chmod($this->file, 0600);
    }

    public function all() {
        return $this->withLock(false, function (&$data) { return $data; });
    }

    private static function txt($value, $limit=400) {
        if (!is_string($value) && !is_numeric($value)) return '';
        $s = trim((string)$value);
        if (function_exists('mb_substr')) return mb_substr($s, 0, $limit, 'UTF-8');
        return substr($s, 0, $limit*3);
    }

    private static function typeMap($types) {
        $map = array();
        foreach ($types as $type) $map[$type['id']] = true;
        return $map;
    }

    private static function newId() {
        return 'a_' . bin2hex(random_bytes(10));
    }

    private static function validId($id) {
        return is_string($id) && preg_match('/^[a-zA-Z][a-zA-Z0-9_-]{1,79}$/D', $id);
    }

    private static function sanitizeRecord($record, $types, $id, $previous=null) {
        if (!is_array($record)) throw new InvalidArgumentException('资产内容格式错误');
        $name = self::txt(isset($record['name']) ? $record['name'] : '', 160);
        if (!$name) throw new InvalidArgumentException('资产名称不能为空');
        $type = self::txt(isset($record['type']) ? $record['type'] : '', 50);
        if (!isset($types[$type])) throw new InvalidArgumentException('资产类型不存在：' . $type);
        $state = self::txt(isset($record['state']) ? $record['state'] : 'active', 30);
        if (!in_array($state, array('active','draft','paused','retired'), true)) $state = 'draft';
        $verification = self::txt(isset($record['verification']) ? $record['verification'] : 'needs_review', 30);
        if (!in_array($verification, array('confirmed', 'needs_review'), true)) $verification = 'needs_review';
        $fields = array('provider','url','address','repo','vaultRef','wallosRef','kodboxRef','navoneRef','loginHint','notes','source');
        $out = array('id'=>$id, 'name'=>$name, 'type'=>$type, 'state'=>$state, 'verification'=>$verification);
        foreach ($fields as $field) {
            $limit = $field === 'notes' ? 6000 : 600;
            $inputValue = array_key_exists($field, $record) ? $record[$field] : ($previous && isset($previous[$field]) ? $previous[$field] : '');
            $out[$field] = self::txt($inputValue, $limit);
        }
        $tags = isset($record['tags']) && is_array($record['tags']) ? $record['tags'] : array();
        $out['tags'] = array();
        foreach (array_slice($tags, 0, 30) as $tag) {
            $tag = self::txt($tag, 36);
            if ($tag && !in_array($tag, $out['tags'], true)) $out['tags'][] = $tag;
        }
        $relations = isset($record['relations']) && is_array($record['relations']) ? $record['relations'] : array();
        $out['relations'] = array();
        foreach (array_slice($relations, 0, 200) as $related) {
            if (self::validId($related) && $related !== $id && !in_array($related, $out['relations'], true)) {
                $out['relations'][] = $related;
            }
        }
        $out['attrs'] = array();
        $attrs = isset($record['attrs']) && is_array($record['attrs']) ? $record['attrs'] : array();
        $count = 0;
        foreach ($attrs as $key=>$value) {
            if ($count >= 60) break;
            $key = self::txt($key, 80);
            if (!$key || !is_scalar($value)) continue;
            $out['attrs'][$key] = self::txt($value, 800);
            ++$count;
        }
        $now = gmdate('c');
        $out['createdAt'] = $previous && !empty($previous['createdAt']) ? $previous['createdAt'] : $now;
        $out['updatedAt'] = $now;
        return $out;
    }

    public function save($record) {
        return $this->withLock(true, function (&$data) use ($record) {
            $types = self::typeMap($data['types']);
            $existingIndex = null; $previous = null;
            $id = is_array($record) && isset($record['id']) ? $record['id'] : '';
            foreach ($data['records'] as $i=>$r) {
                if ($id && $r['id'] === $id) { $existingIndex=$i; $previous=$r; break; }
            }
            if ($existingIndex === null) {
                if (count($data['records']) >= self::MAX_RECORDS) throw new RuntimeException('资产数量已达上限');
                $id = self::newId();
            }
            $item = self::sanitizeRecord($record, $types, $id, $previous);
            $validIds = array();
            foreach ($data['records'] as $r) $validIds[$r['id']] = true;
            $item['relations'] = array_values(array_filter($item['relations'], function($rid) use ($validIds){return isset($validIds[$rid]);}));
            if ($existingIndex === null) $data['records'][] = $item;
            else $data['records'][$existingIndex] = $item;
            return $item;
        });
    }

    public function remove($id) {
        return $this->withLock(true, function (&$data) use ($id) {
            $found = false; $out = array();
            foreach ($data['records'] as $record) {
                if ($record['id'] === $id) {$found = true; continue;}
                $record['relations'] = array_values(array_filter($record['relations'], function($rid) use ($id){return $rid !== $id;}));
                $out[] = $record;
            }
            if (!$found) throw new InvalidArgumentException('资产不存在或已经删除');
            $data['records'] = $out;
            return array('removed'=>$id);
        });
    }

    public function addType($name) {
        return $this->withLock(true, function (&$data) use ($name) {
            $name = self::txt($name, 50);
            if (!$name) throw new InvalidArgumentException('请输入类型名称');
            foreach ($data['types'] as $type) {
                if ($type['name'] === $name) throw new InvalidArgumentException('类型名称已存在');
            }
            if (count($data['types']) >= 50) throw new InvalidArgumentException('最多创建 50 种资产类型');
            $type = array('id'=>'custom_' . bin2hex(random_bytes(5)), 'name'=>$name, 'icon'=>'box');
            $data['types'][] = $type;
            return $type;
        });
    }

    public function renameType($id, $name) {
        return $this->withLock(true, function (&$data) use ($id, $name) {
            $name = self::txt($name, 50);
            if (!$name) throw new InvalidArgumentException('类型名称不能为空');
            foreach ($data['types'] as &$type) {
                if ($type['id'] === $id) {
                    $type['name'] = $name;
                    return $type;
                }
            }
            throw new InvalidArgumentException('类型不存在');
        });
    }

    public function removeType($id) {
        return $this->withLock(true, function (&$data) use ($id) {
            if (strpos((string)$id, 'custom_') !== 0) throw new InvalidArgumentException('内置资产类型不可删除');
            foreach ($data['records'] as $r) if ($r['type'] === $id) {
                throw new InvalidArgumentException('该类型仍有关联资产，请先迁移资产类型');
            }
            $before = count($data['types']);
            $data['types'] = array_values(array_filter($data['types'], function($type) use ($id) {return $type['id'] !== $id;}));
            if (count($data['types']) === $before) throw new InvalidArgumentException('类型不存在');
            return array('removed'=>$id);
        });
    }

    public function import($input) {
        if (!is_array($input) || !isset($input['records']) || !is_array($input['records'])) {
            throw new InvalidArgumentException('导入文件必须包含 records 数组');
        }
        if (isset($input['schemaVersion']) && (int)$input['schemaVersion'] !== self::SCHEMA_VERSION) {
            throw new InvalidArgumentException('资产数据版本不支持导入');
        }
        if (count($input['records']) > self::MAX_RECORDS) throw new InvalidArgumentException('单次导入资产过多');
        $encoded = json_encode($input);
        if ($encoded === false || strlen($encoded) > self::MAX_IMPORT_BYTES) throw new InvalidArgumentException('导入数据不能超过 2 MiB');
        return $this->withLock(true, function (&$data) use ($input) {
            if (isset($input['types']) && is_array($input['types'])) {
                foreach ($input['types'] as $type) {
                    if (!is_array($type)) continue;
                    $id = isset($type['id']) ? $type['id'] : '';
                    if (!self::validId($id)) continue;
                    $exists = false;
                    foreach ($data['types'] as $present) if ($present['id'] === $id) {$exists=true; break;}
                    if ($exists) continue;
                    if (count($data['types']) >= 50) break;
                    $data['types'][] = array('id'=>$id, 'name'=>self::txt(isset($type['name'])?$type['name']:$id,50), 'icon'=>'box');
                }
            }
            $types = self::typeMap($data['types']);
            $byId = array(); $bySignature = array();
            foreach ($data['records'] as $r) {
                $byId[$r['id']] = $r['id'];
                $bySignature[$r['type'] . "\0" . trim($r['name'])] = $r['id'];
            }
            $idMap = array(); $newRecords = array(); $skipped=0; $invalid=0;
            foreach ($input['records'] as $incoming) {
                if (!is_array($incoming) || empty($incoming['name']) || empty($incoming['type']) || !isset($types[$incoming['type']])) {
                    ++$invalid; continue;
                }
                $oldId = isset($incoming['id']) && self::validId($incoming['id']) ? $incoming['id'] : null;
                $signature = $incoming['type'] . "\0" . trim((string)$incoming['name']);
                if (($oldId && isset($byId[$oldId])) || isset($bySignature[$signature])) {
                    $mapped = $oldId && isset($byId[$oldId]) ? $oldId : $bySignature[$signature];
                    if ($oldId) $idMap[$oldId] = $mapped;
                    ++$skipped; continue;
                }
                if (count($data['records']) + count($newRecords) >= self::MAX_RECORDS) {++$invalid; continue;}
                $id = $oldId && !isset($byId[$oldId]) ? $oldId : self::newId();
                try {$record = self::sanitizeRecord($incoming, $types, $id);}
                catch (Exception $e) {++$invalid; continue;}
                if ($oldId) $idMap[$oldId] = $id;
                $byId[$id] = $id; $bySignature[$signature] = $id;
                $newRecords[] = $record;
            }
            foreach ($newRecords as &$record) {
                $mapped = array();
                foreach ($record['relations'] as $oldRid) {
                    $rid = isset($idMap[$oldRid]) ? $idMap[$oldRid] : $oldRid;
                    if ($rid !== $record['id'] && isset($byId[$rid]) && !in_array($rid, $mapped, true)) $mapped[] = $rid;
                }
                $record['relations'] = $mapped;
            } unset($record);
            $data['records'] = array_merge($data['records'], $newRecords);
            return array('added'=>count($newRecords), 'skipped'=>$skipped, 'invalid'=>$invalid,
                         'total'=>count($data['records']));
        });
    }
}
