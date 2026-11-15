<?php
/**
 * Reuse the existing RAG index for file discovery before exploring KodBox
 * folders. Index paths are WebDAV paths, NOT trusted KodBox source paths.
 * Opening an indexed result still goes through app.php::resolve() and current
 * session permission checks; this class never returns an unverified route.
 */
class AiRagLiteIndexedFileLocator {
    private static function clean($str) {
        if (!is_string($str)) return '';
        $str=trim($str);
        return function_exists('mb_strtolower') ?
            mb_strtolower($str,'UTF-8') : strtolower($str);
    }
    private static function score($item,$needle) {
        $name=self::clean($item['name']);
        $stem=preg_replace('/\.[^.]+$/u','',$name);
        $path=self::clean($item['path']);
        $snippet=self::clean($item['snippet']);
        if ($needle==='') return 0;
        if ($stem===$needle || $name===$needle) return 120;
        if (strpos($stem,$needle)!==false) return 100;
        if (strpos($path,$needle)!==false) return 70;
        if (strpos($snippet,$needle)!==false) return 20;
        return 0;
    }
    public static function rank($backendData,$query,$max=8) {
        $hits=is_array($backendData['results']??null)?$backendData['results']:array();
        $needle=self::clean($query);
        $items=array();
        foreach ($hits as $i=>$hit) {
            if (!is_array($hit)) continue;
            $path=trim(strval($hit['path']??''));
            if ($path==='' || strlen($path)>3400) continue;
            $name=trim(strval($hit['name']??''));
            if ($name==='') $name=basename($path);
            $entry=array(
                'name'=>$name,
                'path'=>$path,
                'location'=>strval($hit['location']??''),
                'snippet'=>strval($hit['snippet']??''),
            );
            $entry['snippet']=function_exists('mb_substr') ?
                mb_substr($entry['snippet'],0,650,'UTF-8') :
                substr($entry['snippet'],0,650);
            $entry['score']=self::score($entry,$needle);
            $entry['_order']=$i;
            // Several chunks from the same file are one candidate.
            if (!isset($items[$path]) || $entry['score']>$items[$path]['score'])
                $items[$path]=$entry;
        }
        $items=array_values($items);
        usort($items,function($a,$b) {
            if ($a['score']!==$b['score']) return $b['score']<=>$a['score'];
            return $a['_order']<=>$b['_order'];
        });
        $found=array();
        foreach (array_slice($items,0,max(1,min(20,intval($max)))) as $item) {
            unset($item['score'],$item['_order']);
            $found[]=$item;
        }
        return array(
            'query'=>$query,
            'results'=>$found,
            'count'=>count($found),
            'indexed_only'=>true,
            'note'=>'结果来自现有 RAG 索引（按文件名优先排序、去重）。索引可能不完整；打开原文件仍由 KodBox 当前会话验证权限。',
        );
    }
}
