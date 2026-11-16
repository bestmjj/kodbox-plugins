<?php
/**
 * AI documents are created by the currently logged-in KodBox user.
 * The WebDAV indexing account is NEVER used for writes.
 */
class AiRagLiteDocumentWriter {
    public static function cleanTitle($title) {
        $title = trim(preg_replace('/[\x00-\x1f\x7f\/\\\\:*?"<>|]+/u',' ',strval($title)));
        $title = trim(preg_replace('/\s+/u',' ',$title)," .\t\r\n");
        $title = function_exists('mb_substr') ? mb_substr($title,0,70,'UTF-8') : substr($title,0,70);
        return $title === '' ? '新建文档' : $title;
    }
    private static function home() {
        $id = Session::get('kodUser.sourceInfo.sourceID');
        if (!$id) throw new RuntimeException('当前用户个人空间不可用');
        return KodIO::make($id);
    }
    private static function segments($relative) {
        if (!is_string($relative) || strlen($relative)>2048) throw new RuntimeException('目标路径无效');
        if ($relative === '' || $relative === '.') return array();
        $segments=explode('/',$relative);
        if (count($segments)>15) throw new RuntimeException('目标路径层级过深');
        foreach ($segments as $segment) {
            if ($segment==='' || $segment==='.' || $segment==='..' || strlen($segment)>255 ||
                preg_match('/[\x00-\x1f\x7f\\\\]/',$segment)) {
                throw new RuntimeException('目标路径含有非法字符');
            }
        }
        return $segments;
    }
    private static function entriesIn($path) {
        if (!isset($GLOBALS['in']) || !is_array($GLOBALS['in'])) $GLOBALS['in']=array();
        $present=array_key_exists('pageNum',$GLOBALS['in']);
        $saved=$present ? $GLOBALS['in']['pageNum'] : null;
        $GLOBALS['in']['pageNum']=-1;
        try { $result=Action('explorer.list')->path($path); }
        finally {
            if ($present) $GLOBALS['in']['pageNum']=$saved;
            else unset($GLOBALS['in']['pageNum']);
        }
        if (!is_array($result)) throw new RuntimeException('无法读取文件夹内容');
        return $result;
    }
    private static function foldersIn($path) {
        $result=self::entriesIn($path);
        return isset($result['folderList']) && is_array($result['folderList'])
            ? $result['folderList'] : array();
    }

    public static function resolveFolder($relative,$createDefault=false) {
        $parts=self::segments($relative);
        $path=self::home();
        if (!Action('explorer.auth')->fileCan($path,'show')) throw new RuntimeException('无法查看个人空间');
        foreach ($parts as $i=>$part) {
            $next=false;
            foreach (self::foldersIn($path) as $entry) {
                if (!is_array($entry) || empty($entry['path']) || !isset($entry['name']) ||
                    $entry['name']!==$part || (isset($entry['isDelete']) && $entry['isDelete']=='1')) continue;
                $next=$entry['path'];break;
            }
            if (!$next && $createDefault && $i===0 && count($parts)===1 && $part==='AI草稿') {
                if (!Action('explorer.auth')->fileCan($path,'edit')) throw new RuntimeException('没有创建文件夹权限');
                $created=IO::mkdir(KodIO::clear(rtrim($path,'/').'/AI草稿'));
                if (!$created) throw new RuntimeException('创建 AI草稿 目录失败');
                $next=is_string($created) ? $created : KodIO::clear(rtrim($path,'/').'/AI草稿');
            }
            if (!$next) throw new RuntimeException('不存在或不可访问的目录：'.$part);
            $path=$next;
        }
        $info=IO::info($path);
        if (!is_array($info) || !isset($info['type']) || $info['type']!=='folder')
            throw new RuntimeException('目标位置不是文件夹');
        return $path;
    }
    public static function listFolders($relative='') {
        $path=self::resolveFolder($relative,false);
        $listing=self::entriesIn($path);
        $result=array();
        $files=array();
        $folders=isset($listing['folderList']) && is_array($listing['folderList'])
            ? $listing['folderList'] : array();
        foreach ($folders as $entry) {
            if (!is_array($entry) || !isset($entry['name'],$entry['path']) ||
                (isset($entry['isDelete']) && $entry['isDelete']=='1')) continue;
            $name=strval($entry['name']);
            if ($name==='' || strpos($name,'/')!==false || $name==='.' || $name==='..' ||
                preg_match('/[\x00-\x1f\x7f\\\\]/',$name)) continue;
            $sub=($relative!=='' ? $relative.'/' : '').$name;
            if (strlen($sub)>2048) continue;
            $result[]=array('name'=>$name,'folder'=>$sub);
            if (count($result)>=300) break;
        }
        $list=isset($listing['fileList']) && is_array($listing['fileList']) ? $listing['fileList'] : array();
        foreach ($list as $entry) {
            if (!is_array($entry) || !isset($entry['name'],$entry['path']) ||
                (isset($entry['isDelete']) && $entry['isDelete']=='1')) continue;
            $name=strval($entry['name']);
            if (!self::supportedExtension($name)) continue;
            if (!Action('explorer.auth')->fileCan($entry['path'],'view')) continue;
            $files[]=array('name'=>$name,'size'=>isset($entry['size'])?intval($entry['size']):null,
                'format'=>strtolower(pathinfo($name,PATHINFO_EXTENSION)));
            if (count($files)>=300) break;
        }
        return array('folder'=>$relative,'folders'=>$result,'files'=>$files);
    }
    /**
     * Enumerate ALL normal KodBox files, not just RAG-indexed documents.
     * Listing and reading are two different tools: unsupported file types may
     * appear in the inventory, but cannot be opened as document text.
     */
    public static function agentList($relative='') {
        $path=self::resolveFolder($relative,false);
        $listing=self::entriesIn($path);
        $folders=array();$files=array();
        foreach (($listing['folderList'] ?? array()) as $entry) {
            if (!is_array($entry) || !isset($entry['name'],$entry['path']) ||
                (isset($entry['isDelete']) && $entry['isDelete']=='1')) continue;
            if (!Action('explorer.auth')->fileCan($entry['path'],'show')) continue;
            $name=strval($entry['name']);
            if ($name==='' || strpos($name,'/')!==false || strlen($name)>255) continue;
            $folders[]=array('name'=>$name,'folder'=>($relative!==''?$relative.'/':'').$name);
            if (count($folders)>=100) break;
        }
        foreach (($listing['fileList'] ?? array()) as $entry) {
            if (!is_array($entry) || !isset($entry['name'],$entry['path']) ||
                (isset($entry['isDelete']) && $entry['isDelete']=='1')) continue;
            if (!Action('explorer.auth')->fileCan($entry['path'],'view')) continue;
            $name=strval($entry['name']);
            if ($name==='' || strpos($name,'/')!==false || strlen($name)>255) continue;
            $files[]=array('name'=>$name,
                'size'=>isset($entry['size'])?intval($entry['size']):null,
                'readable_text'=>!!self::supportedExtension($name));
            if (count($files)>=100) break;
        }
        return array('folder'=>$relative,'folders'=>$folders,'files'=>$files,
            'limit'=>100,'note'=>'文件夹和文件均最多返回100项；未列出的项目不代表不存在。');
    }

    /**
     * Convert only a same-user personal-space file URL path into a securely
     * enumerated relative path. Never grant access based only on a URL hash.
     */
    public static function fromActiveFilePath($raw) {
        if (!is_string($raw) || strlen($raw)>3500 || strpos($raw,"\0")!==false)
            throw new RuntimeException('当前文件路径无效');
        $target=KodIO::clear($raw);
        // KodBox virtual paths are not hierarchical prefixes:
        // a child folder may be {source:2002}, whereas the user's home is
        // {source:1001}. Walk the visible personal tree rather than checking
        // an invalid "{source:1001}/" prefix.
        $queue=array(array('path'=>self::home(),'folder'=>'','depth'=>0));
        $visited=array();$checked=0;
        while ($queue && $checked<160) {
            $item=array_shift($queue);
            if (isset($visited[$item['path']])) continue;
            $visited[$item['path']]=true;$checked++;
            if (!Action('explorer.auth')->fileCan($item['path'],'show')) continue;
            $listing=self::entriesIn($item['path']);
            foreach (($listing['fileList'] ?? array()) as $entry) {
                if (!is_array($entry) || !isset($entry['name'],$entry['path'])) continue;
                if (KodIO::clear($entry['path'])!==$target) continue;
                if (!self::supportedExtension($entry['name']) ||
                    !Action('explorer.auth')->fileCan($entry['path'],'view'))
                    throw new RuntimeException('当前文件格式不受支持或无访问权限');
                // Re-enumerate its containing folder under current login.
                $found=self::findDocument($item['folder'],$entry['name'],'view');
                if (KodIO::clear($found['path'])!==$target)
                    throw new RuntimeException('文件路径不匹配');
                return array('folder'=>$item['folder'],'name'=>$entry['name']);
            }
            if ($item['depth']>=10) continue;
            foreach (($listing['folderList'] ?? array()) as $entry) {
                if (!is_array($entry) || !isset($entry['name'],$entry['path']) ||
                    (isset($entry['isDelete']) && $entry['isDelete']=='1')) continue;
                $name=strval($entry['name']);
                if ($name==='' || $name==='.' || $name==='..' || strlen($name)>255 ||
                    strpos($name,'/')!==false || strpos($name,"\\")!==false) continue;
                if (!Action('explorer.auth')->fileCan($entry['path'],'show')) continue;
                $queue[]=array('path'=>$entry['path'],
                    'folder'=>($item['folder']!==''?$item['folder'].'/':'').$name,
                    'depth'=>$item['depth']+1);
                if (count($queue)>180) break;
            }
        }
        throw new RuntimeException('个人空间内未找到此文件，或超过160个目录的遍历限制');
    }

    private static function supportedExtension($name) {
        return is_string($name) && strlen($name)<=255 &&
            preg_match('/\.(md|markdown|txt|docx)$/i',$name) &&
            strpos($name,'/')===false && strpos($name,"\\")===false &&
            strpos($name,"\0")===false && $name!=='.' && $name!=='..';
    }
    private static function findDocument($relative,$name,$action='view') {
        if (!self::supportedExtension($name)) throw new RuntimeException('只支持 Markdown、TXT 和 DOCX 文件');
        $folder=self::resolveFolder($relative,false);
        $listed=self::entriesIn($folder);
        $list=isset($listed['fileList']) && is_array($listed['fileList']) ? $listed['fileList'] : array();
        foreach ($list as $entry) {
            if (!is_array($entry) || !isset($entry['name'],$entry['path']) || $entry['name']!==$name ||
                (isset($entry['isDelete']) && $entry['isDelete']=='1')) continue;
            $path=$entry['path'];
            if (!Action('explorer.auth')->fileCan($path,$action)) throw new RuntimeException('当前用户没有该文件的访问权限');
            return array('folder'=>$folder,'path'=>$path,'name'=>$name,
                'size'=>isset($entry['size'])?intval($entry['size']):null);
        }
        throw new RuntimeException('原文件不存在、已移动或不可访问，请重新选择');
    }
    private static function readBytes($item) {
        if ($item['size']!==null && $item['size']>3*1024*1024)
            throw new RuntimeException('文件大于 3 MB，暂不支持导入');
        $bytes=IO::getContent($item['path']);
        if (!is_string($bytes) || strlen($bytes)>3*1024*1024)
            throw new RuntimeException('读取文件失败或文件大于 3 MB');
        return $bytes;
    }
    private static function importWord($base,$key,$bytes) {
        if (!function_exists('curl_init') || !preg_match('#^https?://[^/]+(:[0-9]+)?$#i',$base) || !$key)
            throw new RuntimeException('Word 解析服务未配置');
        if (substr($bytes,0,2)!=='PK') throw new RuntimeException('Word 文件结构无效');
        $ch=curl_init($base.'/v1/import-docx');
        curl_setopt_array($ch,array(
            CURLOPT_POST=>true,
            CURLOPT_POSTFIELDS=>json_encode(array('data_base64'=>base64_encode($bytes))),
            CURLOPT_HTTPHEADER=>array('Content-Type: application/json','X-RAG-Key: '.$key),
            CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,
            CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>50,
            CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2));
        $response=curl_exec($ch);
        $status=curl_getinfo($ch,CURLINFO_HTTP_CODE);curl_close($ch);
        $data=is_string($response) && $status===200 ? json_decode($response,true) : null;
        if (!is_array($data) || !isset($data['content']) || !is_string($data['content']))
            throw new RuntimeException('Word 正文提取失败，请检查 RAG 后端');
        return $data['content'];
    }
    /**
     * Read a file that the KodBox DAV resolver has already located and
     * authorized under the current user's session. This is strictly read-only;
     * it never turns a virtual RAG index path into a writable home folder.
     */
    public static function readVerifiedDocument($resolved,$base,$key) {
        if (!is_array($resolved) || !isset($resolved['path'],$resolved['name']) ||
            !is_string($resolved['path']) || !is_string($resolved['name']))
            throw new RuntimeException('文件定位结果无效');
        $name=$resolved['name'];
        if (!self::supportedExtension($name))
            throw new RuntimeException('该索引文件格式暂不支持全文读取');
        if (!Action('explorer.auth')->fileCan($resolved['path'],'view'))
            throw new RuntimeException('当前用户无权读取索引文件');
        $info=IO::infoFull($resolved['path']);
        if (!is_array($info) || ($info['type'] ?? '')!=='file' ||
            (isset($info['isDelete']) && $info['isDelete']=='1'))
            throw new RuntimeException('索引指向的文件已移动或不存在');
        $item=array('path'=>$resolved['path'],
            'size'=>isset($info['size'])?intval($info['size']):null);
        return self::readItem($item,'',$name,$base,$key);
    }

    public static function readDocument($relative,$name,$base,$key) {
        $item=self::findDocument($relative,$name,'view');
        return self::readItem($item,$relative,$name,$base,$key);
    }

    private static function readItem($item,$relative,$name,$base,$key) {
        $bytes=self::readBytes($item);
        $format=strtolower(pathinfo($name,PATHINFO_EXTENSION));
        if ($format==='docx') {
            $content=self::importWord($base,$key,$bytes);
            $note='Word 已转换为可编辑的文本与表格；图片、批注和复杂排版可能丢失。只能另存为新的 Word 文件，不能覆盖原文。';
        } else {
            if (strlen($bytes)>100000 || strpos($bytes,"\0")!==false ||
                (function_exists('mb_check_encoding') && !mb_check_encoding($bytes,'UTF-8')))
                throw new RuntimeException('原文件不是受支持的 UTF-8 文本，或超过 100KB');
            $content=$bytes;
            $note='原文件已载入。修改后可以另存为新版本；如需更新原文，会先创建备份。';
        }
        if (strlen($content)>100000) throw new RuntimeException('文件正文太长，暂时无法编辑');
        $title=preg_replace('/\.(md|markdown|txt|docx)$/i','',$name);
        return array('folder'=>$relative,'name'=>$name,'format'=>$format,'title'=>$title,
            'content'=>$content,'hash'=>hash('sha256',$bytes),'note'=>$note);
    }
    public static function overwriteDocument($relative,$name,$expectedHash,$content) {
        $format=strtolower(pathinfo($name,PATHINFO_EXTENSION));
        if (!in_array($format,array('md','markdown','txt'),true))
            throw new RuntimeException('仅允许覆盖 Markdown 和 TXT，Word 请另存新版本');
        if (!is_string($expectedHash) || !preg_match('/^[a-f0-9]{64}$/',$expectedHash))
            throw new RuntimeException('原文件校验信息缺失，请重新载入');
        if (!is_string($content) || trim($content)==='' || strlen($content)>100000)
            throw new RuntimeException('修改后的文章为空或超过 100KB');
        $item=self::findDocument($relative,$name,'edit');
        if (!Action('explorer.auth')->fileCan($item['folder'],'edit'))
            throw new RuntimeException('没有目标文件夹的写入权限');
        $original=self::readBytes($item);
        if (!hash_equals($expectedHash,hash('sha256',$original)))
            throw new RuntimeException('原文件已被其他操作修改，请重新打开后再保存');
        $basename=preg_replace('/\.(md|markdown|txt)$/i','',$name);
        $backup=self::cleanTitle($basename).'-AI修改前-'.date('Ymd-His').'-'.bin2hex(random_bytes(4)).'.'.$format;
        $backupPath=KodIO::clear(rtrim($item['folder'],'/').'/'.$backup);
        // Complete a separate same-folder backup before changing original content.
        $result=IO::mkfile($backupPath,$original,REPEAT_RENAME);
        if (!$result) throw new RuntimeException('创建原文备份失败：'.IO::getLastError(''));
        $recheck=IO::getContent($item['path']);
        if (!is_string($recheck) || !hash_equals($expectedHash,hash('sha256',$recheck)))
            throw new RuntimeException('备份已创建，但原文件发生变化。已停止覆盖，请重新载入');
        if (!IO::setContent($item['path'],$content))
            throw new RuntimeException('备份已创建，但写入原文件失败：'.IO::getLastError(''));
        return array('name'=>$name,'folder'=>$relative,'hash'=>hash('sha256',$content),
            'backup'=>$backup,'route'=>'#fileView&path='.rawurlencode($item['path']));
    }

    private static function docx($base,$key,$content,$title) {
        if (!function_exists('curl_init') ||
            !preg_match('#^https?://[^/]+(:[0-9]+)?$#i',$base) || !$key)
            throw new RuntimeException('Word 导出服务未配置');
        $ch=curl_init($base.'/v1/render-docx');
        curl_setopt_array($ch,array(
            CURLOPT_POST=>true,
            CURLOPT_POSTFIELDS=>json_encode(array('content'=>$content,'title'=>$title),JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER=>array('Content-Type: application/json','X-RAG-Key: '.$key),
            CURLOPT_RETURNTRANSFER=>true,CURLOPT_FOLLOWLOCATION=>false,
            CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>45,
            CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2
        ));
        $body=curl_exec($ch);$status=curl_getinfo($ch,CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body===false || $status!==200 || strlen($body)>8000000)
            throw new RuntimeException('Word 生成接口错误，请检查 RAG API');
        $json=json_decode($body,true);
        $bytes=is_array($json) && isset($json['data_base64']) ? base64_decode($json['data_base64'],true) : false;
        if (!is_string($bytes) || strlen($bytes)>5000000 || substr($bytes,0,2)!=='PK')
            throw new RuntimeException('生成的 Word 数据无效');
        return $bytes;
    }
    public static function save($title,$content,$format,$base,$key,$relative='AI草稿') {
        if (!in_array($format,array('md','docx'),true)) throw new RuntimeException('只支持 Markdown 和 Word');
        if (!is_string($content) || trim($content)==='' || strlen($content)>100000)
            throw new RuntimeException('草稿为空或超过 100KB');
        $folder=self::resolveFolder($relative,true);
        if (!Action('explorer.auth')->fileCan($folder,'edit')) throw new RuntimeException('当前用户不能写入目标文件夹');
        $safe=self::cleanTitle($title);
        $name=$safe.'-'.date('Ymd-His').'-'.bin2hex(random_bytes(4)).'.'.$format;
        $target=KodIO::clear(rtrim($folder,'/').'/'.$name);
        // Do not preflight with IO::info($target): for virtual {source:*}/name
        // paths KodBox can return an existing directory or resolve the parent,
        // even when the named child does not exist. This caused false "exists"
        // errors in an empty folder. REPEAT_RENAME is KodBox's own safe
        // new-file policy: it does not overwrite an existing file.
        $bytes=$format==='docx' ? self::docx($base,$key,$content,$safe) : $content;
        $result=IO::mkfile($target,$bytes,REPEAT_RENAME);
        if (!$result) throw new RuntimeException('保存失败：'.IO::getLastError(''));
        $path=is_string($result)?$result:$target;
        return array('name'=>$name,'path'=>$path,'folder'=>$relative,
            'route'=>'#fileView&path='.rawurlencode($path));
    }
}
