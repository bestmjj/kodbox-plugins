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
    private static function foldersIn($path) {
        if (!isset($GLOBALS['in']) || !is_array($GLOBALS['in'])) $GLOBALS['in']=array();
        $present=array_key_exists('pageNum',$GLOBALS['in']);
        $saved=$present ? $GLOBALS['in']['pageNum'] : null;
        $GLOBALS['in']['pageNum']=-1;
        try { $result=Action('explorer.list')->path($path); }
        finally {
            if ($present) $GLOBALS['in']['pageNum']=$saved;
            else unset($GLOBALS['in']['pageNum']);
        }
        return is_array($result) && isset($result['folderList']) && is_array($result['folderList'])
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
        $result=array();
        foreach (self::foldersIn($path) as $entry) {
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
        return array('folder'=>$relative,'folders'=>$result);
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
        if (IO::info($target)) throw new RuntimeException('文件已存在，不允许覆盖');
        $bytes=$format==='docx' ? self::docx($base,$key,$content,$safe) : $content;
        $result=IO::mkfile($target,$bytes,REPEAT_RENAME);
        if (!$result) throw new RuntimeException('保存失败：'.IO::getLastError(''));
        $path=is_string($result)?$result:$target;
        return array('name'=>$name,'path'=>$path,'folder'=>$relative,
            'route'=>'#fileView&path='.rawurlencode($path));
    }
}
