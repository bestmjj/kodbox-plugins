<?php
/**
 * Read-only, deterministic adapter for the AssetLedger Kodbox plugin.
 *
 * This is not a vector/LLM query. It reads the current AssetLedger store and
 * answers bounded, verifiable inventory and relationship questions. Data is
 * never submitted to an external model or the RAG document service.
 */
class AiRagLiteAssetQuery {
    private static function lower($text) {
        $text = (string)$text;
        return function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);
    }

    private static function has($haystack, $needle) {
        return $needle !== '' && strpos(self::lower($haystack), self::lower($needle)) !== false;
    }

    private static function plain($value, $limit=160) {
        $s = trim((string)$value);
        // Keep user-maintained names as text, not Markdown control characters.
        $s = preg_replace('/[\\r\\n|\x00-\x1f\x7f<>\x60\x2a\x5f\[\]{}]/u', ' ', $s);
        if (function_exists('mb_substr')) return mb_substr($s, 0, $limit, 'UTF-8');
        return substr($s, 0, $limit * 3);
    }

    private static function types($data) {
        $types = array();
        foreach (($data['types'] ?? array()) as $t) {
            if (is_array($t) && isset($t['id'], $t['name'])) $types[$t['id']] = self::plain($t['name'], 80);
        }
        return $types;
    }

    private static function records($data) {
        $out = array();
        foreach (($data['records'] ?? array()) as $r) {
            if (!is_array($r) || empty($r['id']) || empty($r['name']) || empty($r['type'])) continue;
            $out[$r['id']] = $r;
        }
        return $out;
    }

    private static function links($records) {
        $links = array();
        foreach ($records as $id=>$r) $links[$id] = array();
        foreach ($records as $id=>$r) {
            foreach ((is_array($r['relations'] ?? null) ? $r['relations'] : array()) as $rid) {
                if ($rid === $id || !isset($records[$rid])) continue;
                $links[$id][$rid] = true;
                $links[$rid][$id] = true;
            }
        }
        return $links;
    }

    private static function score($query, $row) {
        $name = self::lower((string)($row['name'] ?? ''));
        $q = self::lower($query);
        if (strlen($name) >= 4 && strpos($q, $name) !== false) return 100;
        $simplified = preg_replace('/[\s\-_]+/u', '', $name);
        $cq = preg_replace('/[\s\-_]+/u', '', $q);
        if (strlen($simplified) >= 5 && strpos($cq, $simplified) !== false) return 95;
        $score = 0;
        preg_match_all('/[a-z][a-z0-9._-]{2,}/i', $name, $english);
        $common = array('vps','docker','server','github','cloud','http','https','site','service','project','tools','api','com','net','www');
        foreach (array_unique($english[0]) as $word) {
            if (strlen($word) < 4 || in_array($word, $common, true)) continue;
            if (strpos($q, self::lower($word)) !== false) $score += 25;
        }
        preg_match_all('/[\x{4e00}-\x{9fff}]{3,}/u', $name, $chinese);
        foreach (array_unique($chinese[0]) as $word) {
            if (self::has($q, $word)) $score += 35;
        }
        return $score;
    }

    private static function asResult($row, $types, $links) {
        return array(
            'kind'=>'asset',
            'id'=>(string)$row['id'],
            'name'=>self::plain($row['name']),
            'type'=>$types[$row['type']] ?? self::plain($row['type']),
            'provider'=>self::plain($row['provider'] ?? '', 100),
            'status'=>($row['state'] ?? '') === 'active' ? '使用中' : (($row['state'] ?? '') === 'retired' ? '已归档' : '待整理 / 暂停'),
            'relatedCount'=>count($links[$row['id']] ?? array())
        );
    }

    public static function wantsAssets($query, $data) {
        if (preg_match('/数字资产|资产台账|资产盘点|资产清单|资产登记|资产关联|资产关系|有多少资产|哪些资产|我的资产|停用.*(服务器|VPS)|迁移.*(服务器|VPS)/ui', $query)) return true;
        if (preg_match('/我的.{0,5}(服务器|VPS|域名|网站|站点|服务|账号|云主机)|哪些.{0,7}(服务器|VPS|域名|网站|站点)/ui', $query)) return true;
        foreach (self::records($data) as $r) {
            if (self::score($query, $r) >= 25) return true;
        }
        return false;
    }

    public static function run($query, $data) {
        $query = trim((string)$query);
        if ($query === '') throw new InvalidArgumentException('请输入搜索内容');
        $types = self::types($data);
        $records = self::records($data);
        $links = self::links($records);
        $total = count($records);
        $verified = 0;
        $linked = 0;
        $counts = array();
        foreach ($records as $r) {
            if (($r['verification'] ?? '') === 'confirmed') $verified++;
            if (count($links[$r['id']]) > 0) $linked++;
            $type = $types[$r['type']] ?? $r['type'];
            $counts[$type] = ($counts[$type] ?? 0) + 1;
        }
        $header = "**AssetLedger 实时数据**（不是文档检索或外部 AI 推测）\n\n";
        $answer = '';
        $hits = array();
        $isImpact = preg_match('/影响|迁移|停用|关停|关掉|关闭|下线|报废|故障|转移|取消续费/ui', $query);
        $isAudit = preg_match('/待核实|未核实|缺少|没关联|未关联|不完整|待完善|需补齐|孤立/ui', $query);
        $isOverview = preg_match('/数字资产|资产盘点|资产清单|资产总数|我有哪些资产|我的资产|统计|概览|总共/ui', $query);
        if (!$total) {
            $answer = $header . '资产台账目前是空的。请先在 AssetLedger 登记资产；此处不会从 Docker、域名或文档中自动推测。';
        } elseif ($isAudit) {
            $unverified = array_values(array_filter($records, function($r) {return ($r['verification'] ?? '') !== 'confirmed';}));
            $isolated = array_values(array_filter($records, function($r) use ($links) {return !count($links[$r['id']]);}));
            $answer = $header . '共 **' . $total . '** 项，待核实 **' . count($unverified) . '** 项，未关联任何其他资产 **' . count($isolated) . "** 项。\n\n";
            $answer .= "**优先完善的待核实资产（最多 12 项）：**\n";
            foreach (array_slice($unverified,0,12) as $r) {
                $answer .= '- ' . self::plain($r['name']) . '（' . ($types[$r['type']] ?? '其他') . "）\n";
                $hits[$r['id']] = $r;
            }
            if (!count($unverified)) $answer .= "- 暂无。\n";
            $answer .= "\n注意：待核实状态仅来自你登记的字段，并不等同于真实资产异常。";
        } else {
            $matching = array();
            foreach ($records as $r) {
                $score = self::score($query, $r);
                if ($score > 0) $matching[] = array('r'=>$r,'score'=>$score);
            }
            usort($matching, function($a,$b){return $b['score'] - $a['score'];});
            if ($matching && (!$isOverview || $isImpact)) {
                $topScore = $matching[0]['score'];
                $selected = array();
                foreach ($matching as $m) {
                    if (count($selected) >= 4 || $m['score'] < max(25, $topScore - 25)) break;
                    $selected[] = $m['r'];
                }
                $answer = $header;
                if ($isImpact) $answer .= "**初步影响线索**（仅按人工关联推断，并非真实部署依赖验证）：\n\n";
                else $answer .= "**找到这些资产：**\n\n";
                foreach ($selected as $r) {
                    $rid = $r['id'];
                    $hits[$rid] = $r;
                    $answer .= '- **' . self::plain($r['name']) . '**（' . ($types[$r['type']] ?? '其他') . '）：';
                    $answer .= '状态 ' . (($r['state'] ?? '') === 'active' ? '使用中' : '非使用中') . '，';
                    $answer .= '直接关联 ' . count($links[$rid]) . " 项\n";
                    $related = array_keys($links[$rid]);
                    foreach (array_slice($related,0,18) as $otherId) {
                        $other = $records[$otherId];
                        $answer .= '  - ' . self::plain($other['name']) . '（' . ($types[$other['type']] ?? '其他') . "）\n";
                        $hits[$otherId] = $other;
                    }
                    if (count($related)>18) $answer .= '  - 另有 ' . (count($related)-18) . " 项未展开\n";
                }
                if ($isImpact) $answer .= "\n**提醒：**关联目前没有“部署于 / 依赖于”等方向标签。关闭服务器前还需实测服务、DNS、存储和备份，不能仅凭这份列表执行停机。";
                else $answer .= "\n数据来自手工录入的资产关联，缺失的项目不会自动出现。";
            } elseif ($isOverview || preg_match('/(?:几台|哪些|所有|全部).{0,6}(?:服务器|VPS|域名|网站|站点|平台账号)/ui', $query)) {
                $answer = $header . '当前登记 **' . $total . '** 项资产，其中已确认 **' . $verified . '** 项，待核实 **' . ($total-$verified) . '** 项；有关系的资产 **' . $linked . '** 项，孤立资产 **' . ($total-$linked) . "** 项。\n\n**资产类别：**\n";
                arsort($counts);
                foreach ($counts as $label=>$count) $answer .= '- ' . self::plain($label) . '：' . $count . " 项\n";
                $answer .= "\n你可以继续问：“Nuyek 关联哪些服务？”、“哪一些资产待核实？”或“Netcup 下线可能影响哪些资产？”";
            } else {
                $q = self::lower($query);
                $want = '';
                if (self::has($q,'域名')) $want = 'domain';
                elseif (self::has($q,'网站') || self::has($q,'站点')) $want = 'website';
                elseif (self::has($q,'服务器') || self::has($q,'vps')) $want = 'server';
                elseif (self::has($q,'项目') || self::has($q,'仓库')) $want = 'project';
                elseif (self::has($q,'账号')) $want = 'account';
                $filtered = array_values(array_filter($records,function($r) use($want,$q){
                    if ($want) return $r['type']===$want;
                    return AiRagLiteAssetQuery::has($r['name'] ?? '',$q) || AiRagLiteAssetQuery::has($r['provider'] ?? '',$q);
                }));
                $answer = $header . '匹配资产 **' . count($filtered) . "** 项：\n";
                foreach (array_slice($filtered,0,20) as $r) {
                    $answer .= '- ' . self::plain($r['name']) . '（' . ($types[$r['type']] ?? '其他') . "）\n";
                    $hits[$r['id']] = $r;
                }
                if (!$filtered) $answer .= '没有找到匹配的登记记录；这不代表资产实际不存在。';
            }
        }
        return array(
            'sourceType'=>'assets',
            'mode'=>'asset_live',
            'answer'=>$answer,
            'results'=>array_map(function($r) use($types,$links){return self::asResult($r,$types,$links);},array_slice(array_values($hits),0,35)),
            'note'=>'来源：Kodbox 本地 AssetLedger（只读、按请求实时读取）。不包含密码、密钥或 Bitwarden 内容；文档 RAG 需切换到“文档”。',
            'total'=>$total
        );
    }
}
