(function () {
'use strict';
var conf = window.assetLedgerInit || {};
var state = { data: {schemaVersion:1,types:[],records:[]}, category:'all', filter:'all', reviewOnly:false, search:'', selection:null, editing:null, rels:[], toastTimer:null, wallosItems:null, wallosFetchedAt:0, editingWallosId:'' };
var $ = function(id) { return document.getElementById(id); };
var labels = {active:'使用中', draft:'待整理', paused:'暂停', retired:'已归档'};
var formFields = {provider:'assetProvider',url:'assetUrl',address:'assetAddress',repo:'assetRepo',vaultRef:'assetVaultRef',wallosRef:'assetWallosRef',kodboxRef:'assetKodboxRef',navoneRef:'assetNavoneRef',loginHint:'assetLoginHint',notes:'assetNotes'};
var detailLabels = {provider:'服务商 / 平台',url:'访问 / 管理地址',address:'IP / 部署位置',repo:'代码仓库',vaultRef:'Bitwarden 引用',wallosRef:'Wallos 旧备注',wallosId:'Wallos 订阅 ID',kodboxRef:'Kodbox 文档',navoneRef:'NavOne 引用',loginHint:'登录标识',notes:'备注 / 核实事项',source:'资料来源'};

function node(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = String(txt);
    return e;
}
function reset(e){ while (e.firstChild) e.removeChild(e.firstChild); }
function toast(message, isError) {
    var t = $('toast');t.textContent=message;t.style.background=isError?'#ae3f4f':'#263955';t.hidden=false;
    clearTimeout(state.toastTimer);state.toastTimer=setTimeout(function(){t.hidden=true;},3200);
}
async function api(op, data) {
    var body = new URLSearchParams();
    body.set('op', op);
    body.set('csrf', conf.csrf || '');
    body.set('data', JSON.stringify(data || {}));
    var response = await fetch((conf.apiBase || '') + 'api', {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:body.toString(),cache:'no-store'});
    if (!response.ok) throw new Error('网络请求失败：HTTP ' + response.status);
    var result;
    try { result=await response.json(); } catch (_) { throw new Error('接口没有返回 JSON，请确认 Kodbox 登录状态及插件是否启用'); }
    if (!result || !result.code) throw new Error((result && typeof result.data === 'string' && result.data) || '操作失败');
    return result.data;
}
function byId(id) {return state.data.records.find(function(x){return x.id===id;}) || null;}
function typeLabel(id) {var t=state.data.types.find(function(x){return x.id===id;});return t?t.name:id;}
function typeGlyph(id){return ({server:'▣',device:'▤',network:'⌁',domain:'◎',website:'◉',service:'▦',project:'〈〉',account:'♙',entitlement:'✧',document:'▤',other:'◇'})[id]||'◇';}
function getLinks(item){
    if (!item) return [];
    var seen={};
    (item.relations||[]).forEach(function(id){seen[id]=true;});
    state.data.records.forEach(function(row){if((row.relations||[]).indexOf(item.id)!==-1)seen[row.id]=true;});
    delete seen[item.id];
    return Object.keys(seen).map(byId).filter(Boolean);
}
function known(item){return item.verification==='confirmed';}
function statCard(label, value, hint) {
    var a=node('div','stat'); a.appendChild(node('div','stat-label',label)); a.appendChild(node('div','stat-value',value));a.appendChild(node('div','stat-note',hint));return a;
}
function renderStats(){
    var r=state.data.records, active=r.filter(function(x){return x.state==='active';}).length;
    var review=r.filter(function(x){return !known(x);}).length;
    var linked=r.filter(function(x){return getLinks(x).length>0;}).length;
    reset($('stats'));
    $('stats').appendChild(statCard('资产总数',r.length,'已登记的数字资产'));
    $('stats').appendChild(statCard('正在使用',active,'使用中状态'));
    $('stats').appendChild(statCard('等待核实',review,'历史信息 / 待完善'));
    $('stats').appendChild(statCard('建立关联',linked,'已连接其他资产'));
}
function categoryButton(id, title, count){
    var button=node('button','nav-item'+(state.category===id?' selected':''));
    button.type='button';button.appendChild(node('span','',title));button.appendChild(node('span','count',count));
    button.addEventListener('click',function(){state.category=id;render();});return button;
}
function renderCategories(){
    var cat=$('categories');reset(cat);
    cat.appendChild(categoryButton('all','全部资产',state.data.records.length));
    state.data.types.forEach(function(t){
        var n=state.data.records.filter(function(x){return x.type===t.id;}).length;
        cat.appendChild(categoryButton(t.id,t.name,n));
    });
}
function match(rec){
    if(state.category!=='all' && rec.type!==state.category)return false;
    if(state.filter!=='all' && rec.state!==state.filter)return false;
    if(state.reviewOnly && known(rec))return false;
    var q=state.search.trim().toLowerCase();if(!q)return true;
    var content=[rec.name,rec.type,rec.provider,rec.url,rec.address,rec.repo,rec.notes,rec.loginHint,(rec.tags||[]).join(' '),JSON.stringify(rec.attrs||{})].join(' ').toLowerCase();
    return content.indexOf(q)!==-1;
}
function assetRow(item){
    var row=node('div','asset-row'+(state.selection===item.id?' selected':''));
    row.tabIndex=0;row.setAttribute('role','button');
    var n=node('div','name-wrap'), icon=node('div','asset-icon',typeGlyph(item.type)), text=node('div');
    text.appendChild(node('div','primary-name',item.name));
    text.appendChild(node('div','sub',item.url||item.address||item.provider||'未设置地址'));
    n.appendChild(icon);n.appendChild(text);
    var sec=node('div','secondary-cell');sec.appendChild(node('div','primary-name',typeLabel(item.type)));sec.appendChild(node('div','sub',item.provider||'—'));
    var status=node('div');status.appendChild(node('span','badge '+item.state,labels[item.state]||item.state));
    if (!known(item)) {var rev=node('span','review-dot');rev.title='待核实';status.appendChild(rev);}
    var rel=node('div'); rel.appendChild(node('span','count-pill',getLinks(item).length));
    row.append(n,sec,status,rel);
    row.addEventListener('click',function(){state.selection=item.id;renderRows();renderDetail();});
    row.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();row.click();}});
    return row;
}
function renderRows(){
    var items=state.data.records.filter(match).slice().sort(function(a,b){return (b.updatedAt||'').localeCompare(a.updatedAt||'')||a.name.localeCompare(b.name);});
    $('sectionTitle').textContent=state.category==='all'?'全部资产':typeLabel(state.category);
    $('resultCount').textContent='共 '+items.length+' 项';
    $('loading').hidden=true;$('assetTable').hidden=!items.length;$('empty').hidden=!!items.length;
    var rows=$('assetRows');reset(rows);items.forEach(function(i){rows.appendChild(assetRow(i));});
}
function kv(container,key,value){
    if(value===undefined||value===null||String(value).trim()==='')return;
    var r=node('div','kv');r.appendChild(node('span','key',key));var val=node('span','val');
    var v=String(value);
    if (/^https?:\/\//i.test(v)) {
        try {var url = new URL(v); if(url.protocol==='http:'||url.protocol==='https:') {
            var a=node('a','',v);a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';val.appendChild(a);
        } else val.textContent=v;} catch(_){val.textContent=v;}
    }else{val.textContent=v;}
    r.appendChild(val);container.appendChild(r);
}
function subsection(title){var s=node('section','detail-section');s.appendChild(node('h3','',title));return s;}
function renderDetail(){
    var selected=byId(state.selection);var p=$('detail');p.hidden=!selected;
    document.querySelector('.workbench').classList.toggle('with-detail',!!selected);
    if (!selected) return;
    $('detailName').textContent=selected.name;var out=$('detailContent');reset(out);
    var core=subsection('基本信息');kv(core,'类别',typeLabel(selected.type));kv(core,'状态',labels[selected.state]||selected.state);kv(core,'核实',known(selected)?'已确认':'待核实');
    Object.keys(detailLabels).forEach(function(key){kv(core,detailLabels[key],selected[key]);});
    out.appendChild(core);
    var fields=Object.entries(selected.attrs||{});
    if(fields.length){var s=subsection('扩展字段');fields.forEach(function(p){kv(s,p[0],p[1]);});out.appendChild(s);}
    if((selected.tags||[]).length){var t=subsection('标签'), chips=node('div','chips');selected.tags.forEach(function(tg){chips.appendChild(node('span','chip',tg));});t.appendChild(chips);out.appendChild(t);}
    var links=getLinks(selected);var s=subsection('关联资产 ('+links.length+')');
    if(!links.length)s.appendChild(node('p','muted','尚未建立关联'));
    else {var c=node('div','chips');links.forEach(function(link){var button=node('button','chip click',link.name);button.type='button';button.addEventListener('click',function(){state.selection=link.id;renderRows();renderDetail();});c.appendChild(button);});s.appendChild(c);}
    out.appendChild(s);
    if (selected.wallosId) {
        var currentSelection = selected.id;
        var live = subsection('Wallos 订阅实时信息');
        live.appendChild(node('p','hint','正在查询 Wallos…'));
        out.appendChild(live);
        loadWallos(false).then(function(items) {
            if (state.selection !== currentSelection) return;
            reset(live);
            live.appendChild(node('h3','', 'Wallos 订阅实时信息'));
            var sub = items.find(function(x){return x.id === selected.wallosId;});
            if (!sub) {
                live.appendChild(node('p','hint','当前 Wallos 列表中未找到订阅 ID ' + selected.wallosId + '，请检查关联。'));
                return;
            }
            kv(live,'订阅名称',sub.name);
            kv(live,'金额',sub.price + ' ' + (sub.currency || ('币种 ID ' + sub.currencyId)));
            kv(live,'下次付款',sub.nextPayment);
            kv(live,'状态',sub.inactive ? '已停用' : '使用中');
        }).catch(function(err){
            if (state.selection !== currentSelection) return;
            reset(live);
            live.appendChild(node('h3','', 'Wallos 订阅实时信息'));
            live.appendChild(node('p','hint','暂时无法读取 Wallos：' + err.message));
        });
    }
    kv(out,'记录更新时间',selected.updatedAt ? selected.updatedAt.replace('T',' ').slice(0,16):'');
}
function render(){renderStats();renderCategories();renderRows();renderDetail();}
async function load() {
    try {state.data=await api('list',{});render();}
    catch(e){$('loading').textContent='加载失败：'+e.message;toast(e.message,true);}
}
function addField(k,v){
    var row=node('div','extra-field');var key=node('input'), value=node('input'), del=node('button','small-x','×');
    key.type='text';key.maxLength=80;key.placeholder='字段名，例如 CPU';key.value=k||'';
    value.type='text';value.maxLength=800;value.placeholder='字段值';value.value=v||'';
    del.type='button';del.title='删除字段';del.addEventListener('click',function(){row.remove();});
    row.append(key,value,del);$('extraFields').appendChild(row);
}
function renderRelationPicker(){
    var picker=$('relationSelect');reset(picker);picker.appendChild(new Option('选择要关联的资产…',''));
    state.data.records.filter(function(x){return x.id!==state.editing;}).sort(function(a,b){return a.name.localeCompare(b.name);}).forEach(function(item){
        picker.appendChild(new Option(item.name+' · '+typeLabel(item.type),item.id));
    });
    var chips=$('relationChips');reset(chips);
    state.rels.filter(function(id){return byId(id);}).forEach(function(id){
        var item=byId(id), c=node('span','chip');c.appendChild(node('span','',item.name));
        var b=node('button','', '×');b.type='button';b.title='取消关联';b.addEventListener('click',function(){state.rels=state.rels.filter(function(x){return x!==id;});renderRelationPicker();});
        c.appendChild(b);chips.appendChild(c);
    });
}
function openEdit(item, isDuplicate) {
    var r=item||{}, isEdit=!!item && !isDuplicate;
    state.editing=isEdit?item.id:null;state.rels=(item&&item.relations?item.relations:[]).slice();
    state.editingWallosId=r.wallosId||'';
    $('modalTitle').textContent=isDuplicate?'复制资产':(isEdit?'编辑资产':'新增资产');
    $('assetId').value=isEdit?(r.id||''):'';$('assetName').value=r.name||'';
    var type=$('assetType');reset(type);state.data.types.forEach(function(t){type.appendChild(new Option(t.name,t.id));});
    type.value=r.type||((state.category!=='all')?state.category:'server');
    $('assetState').value=r.state||'active';$('assetVerification').value=r.verification||'needs_review';
    Object.keys(formFields).forEach(function(k){$(formFields[k]).value=r[k]||'';});
    $('assetTags').value=(r.tags||[]).join(', ');
    reset($('extraFields'));Object.entries(r.attrs||{}).forEach(function(p){addField(p[0],p[1]);});
    renderRelationPicker();$('assetWallosId').dataset.ready='0';renderWallosPicker();
    $('editModal').showModal();$('assetName').focus();
    loadWallos(false).then(renderWallosPicker).catch(function(err){$('wallosPickerHint').textContent=err.message;});
}
function collectForm(){
    var record={id:$('assetId').value,name:$('assetName').value.trim(),type:$('assetType').value,state:$('assetState').value,verification:$('assetVerification').value};
    Object.keys(formFields).forEach(function(k){record[k]=$(formFields[k]).value.trim();});
    record.tags=$('assetTags').value.split(/[,，、]/).map(function(x){return x.trim();}).filter(Boolean);
    record.relations=state.rels.slice();record.wallosId=$('assetWallosId').value;record.attrs={};
    Array.from($('extraFields').children).forEach(function(row){var ins=row.querySelectorAll('input'),k=ins[0].value.trim();if(k)record.attrs[k]=ins[1].value.trim();});
    return record;
}
async function saveForm(e){
    e.preventDefault();var btn=$('saveBtn'),record=collectForm();if(!record.name){toast('资产名称不能为空',true);return;}
    btn.disabled=true;
    try {var result=await api('save',{record:record});$('editModal').close();state.selection=result.id;await load();toast('资产已保存');}
    catch(err){toast(err.message,true);}finally{btn.disabled=false;}
}
async function deleteAsset(){
    var r=byId(state.selection);if(!r)return;
    if(!confirm('确认删除“'+r.name+'”？此操作会移除其他资产对它的关联，建议先导出 JSON 备份。'))return;
    try{await api('remove',{id:r.id});state.selection=null;await load();toast('资产已删除');}catch(err){toast(err.message,true);}
}
function renderTypes(){
    var list=$('typeList');reset(list);
    state.data.types.forEach(function(t){
        var r=node('div','type-row'),n=node('span','type-name',t.name),code=node('span','type-code',t.id),edit=node('button','btn tiny','改名');
        edit.type='button';edit.addEventListener('click',async function(){var v=prompt('新的显示名称：',t.name);if(v===null)return;try{await api('renameType',{id:t.id,name:v});await load();renderTypes();toast('分类名称已修改');}catch(err){toast(err.message,true);}});
        r.append(n,code,edit);
        if(t.id.indexOf('custom_')===0){var del=node('button','btn tiny danger','删除');del.type='button';del.addEventListener('click',async function(){if(!confirm('确认删除空分类“'+t.name+'”？'))return;try{await api('removeType',{id:t.id});await load();renderTypes();toast('分类已删除');}catch(err){toast(err.message,true);}});r.appendChild(del);}
        list.appendChild(r);
    });
}
function exportJson(){
    var content=JSON.stringify({schemaVersion:state.data.schemaVersion,exportedAt:new Date().toISOString(),types:state.data.types,records:state.data.records},null,2);
    var blob=new Blob([content],{type:'application/json;charset=utf-8'}),u=URL.createObjectURL(blob),a=node('a');
    a.href=u;a.download='kodbox-asset-ledger-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u);},2000);
    toast('JSON 备份已导出，请妥善保存');
}
async function importFile(file){
    if(!file)return;
    if(file.size>2*1024*1024){toast('单次导入限制 2 MiB',true);return;}
    try{
        var content=await file.text(),data=JSON.parse(content);
        if(!data||!Array.isArray(data.records))throw new Error('文件缺少 records 数组');
        var n=data.records.length;
        if(!confirm('将从 '+file.name+' 导入 '+n+' 项资产。\n\n采用安全合并：已有相同 ID 或“同类同名”的资产会跳过，不覆盖你已编辑的资料。继续吗？'))return;
        var result=await api('import',data);await load();
        toast('导入完成：新增 '+result.added+'，跳过 '+result.skipped+'，无效 '+result.invalid);
    }catch(err){toast('导入失败：'+err.message,true);}
}
function wallosLabel(item) {
    return item.name + ' · #' + item.id + ' · ' +
        (item.price ? item.price + ' ' + (item.currency || '') + ' · ' : '') +
        (item.nextPayment || '无下次日期');
}
function renderWallosPicker(){
    var select=$('assetWallosId');
    var chosen=select.dataset.ready==='1' ? select.value : state.editingWallosId;
    reset(select);
    select.appendChild(new Option('不关联 Wallos 订阅',''));
    (state.wallosItems||[]).forEach(function(item) {
        select.appendChild(new Option(wallosLabel(item), item.id));
    });
    if(chosen && !(state.wallosItems||[]).some(function(item){return item.id===chosen;})) {
        select.appendChild(new Option('已关联订阅 ID '+chosen+'（当前列表未找到）',chosen));
    }
    select.value=chosen||'';
    select.dataset.ready='1';
    $('wallosPickerHint').textContent=state.wallosItems===null
        ? '请先在顶部 Wallos 设置中配置连接。旧的手动 Wallos 备注仍会保留。'
        : '已读取 '+state.wallosItems.length+' 项 Wallos 订阅。选择后只保存订阅 ID，不复制费用数据。';
}
async function loadWallos(force) {
    if (!force && state.wallosItems!==null && (Date.now()-state.wallosFetchedAt < 60000)) {
        return state.wallosItems;
    }
    var result=await api('wallosList',{});
    if(!Array.isArray(result.subscriptions))throw new Error('Wallos 返回数据缺少 subscriptions');
    state.wallosItems=result.subscriptions;
    state.wallosFetchedAt=Date.now();
    if($('editModal').open)renderWallosPicker();
    return state.wallosItems;
}
async function openWallosSettings(){
    $('wallosModal').showModal();
    $('wallosConnectionStatus').textContent='正在读取配置…';
    try {
        var cfg=await api('wallosConfig',{});
        $('wallosUrl').value=cfg.url||'';
        $('wallosKey').value='';
        $('wallosConnectionStatus').textContent=cfg.configured?'服务端已保存 API Key（不会显示）':'尚未配置 Wallos API Key';
    } catch(err) {
        $('wallosConnectionStatus').textContent='读取配置失败：'+err.message;
    }
}
async function saveWallosSettings(){
    $('wallosSave').disabled=true;
    try {
        var cfg=await api('wallosSaveConfig',{url:$('wallosUrl').value.trim(),apiKey:$('wallosKey').value.trim()});
        $('wallosKey').value='';
        state.wallosItems=null;
        $('wallosConnectionStatus').textContent='配置已保存，正在测试读取…';
        try {
            var list=await loadWallos(true);
            $('wallosConnectionStatus').textContent='连接成功，读取到 '+list.length+' 项订阅';
            toast('Wallos 已连接：'+list.length+' 项订阅');
        } catch(err) {
            $('wallosConnectionStatus').textContent='配置已保存，但读取失败：'+err.message;
            toast('Wallos 连接测试失败：'+err.message,true);
        }
        return cfg;
    } catch(err) {
        $('wallosConnectionStatus').textContent='保存失败：'+err.message;
        toast(err.message,true);
    } finally {
        $('wallosSave').disabled=false;
    }
}

function wire(){
    $('search').addEventListener('input',function(e){state.search=e.target.value;renderRows();});
    $('stateFilter').addEventListener('change',function(e){state.filter=e.target.value;renderRows();});
    $('reviewOnly').addEventListener('change',function(e){state.reviewOnly=e.target.checked;renderRows();});
    $('addBtn').addEventListener('click',function(){openEdit(null);});
    $('editBtn').addEventListener('click',function(){openEdit(byId(state.selection));});
    $('duplicateBtn').addEventListener('click',function(){
        var original=byId(state.selection);
        if(!original)return;
        var copy=JSON.parse(JSON.stringify(original));
        copy.id='';
        copy.name=original.name+' - 副本';
        // Do not silently inherit deployment relations or a billing subscription.
        // The user may deliberately select them again before saving.
        copy.relations=[];
        copy.wallosId='';
        openEdit(copy,true);
        toast('已复制基本资料；请核对名称、IP、部署路径及关联关系');
    });
    $('deleteBtn').addEventListener('click',deleteAsset);
    $('closeDetail').addEventListener('click',function(){state.selection=null;renderRows();renderDetail();});
    $('reloadBtn').addEventListener('click',load);
    $('editForm').addEventListener('submit',saveForm);
    Array.from(document.querySelectorAll('[data-close-modal]')).forEach(function(b){b.addEventListener('click',function(){$('editModal').close();});});
    $('addField').addEventListener('click',function(){addField('','');});
    $('addRelation').addEventListener('click',function(){var id=$('relationSelect').value;if(!id)return;if(state.rels.indexOf(id)<0)state.rels.push(id);renderRelationPicker();});
    $('refreshWallosBtn').addEventListener('click',function(){
        $('wallosPickerHint').textContent='正在刷新订阅…';
        loadWallos(true).then(function(){renderWallosPicker();toast('Wallos 订阅已更新');}).catch(function(err){$('wallosPickerHint').textContent=err.message;toast(err.message,true);});
    });
    $('wallosBtn').addEventListener('click',openWallosSettings);
    $('wallosClose').addEventListener('click',function(){$('wallosModal').close();});
    $('wallosSave').addEventListener('click',saveWallosSettings);
    $('wallosTest').addEventListener('click',function(){
        $('wallosConnectionStatus').textContent='正在测试已保存的连接…';
        loadWallos(true).then(function(list){
            $('wallosConnectionStatus').textContent='连接成功：'+list.length+' 项订阅';
            toast('读取成功');
        }).catch(function(err){
            $('wallosConnectionStatus').textContent='测试失败：'+err.message;
            toast(err.message,true);
        });
    });
    $('wallosClear').addEventListener('click',async function(){
        if(!confirm('断开 Wallos？已建立的订阅 ID 关联会保留，但无法显示费用，直到重新连接。'))return;
        try{
            await api('wallosClearConfig',{});
            state.wallosItems=null;state.wallosFetchedAt=0;
            $('wallosUrl').value='';$('wallosKey').value='';
            $('wallosConnectionStatus').textContent='Wallos 已断开';
            toast('Wallos 连接已清除');
        }catch(err){toast(err.message,true);}
    });
    $('importBtn').addEventListener('click',function(){$('importFile').click();});
    $('importFile').addEventListener('change',function(e){importFile(e.target.files[0]);e.target.value='';});
    $('exportBtn').addEventListener('click',exportJson);
    $('typesBtn').addEventListener('click',function(){renderTypes();$('typesModal').showModal();});
    Array.from(document.querySelectorAll('[data-close-types]')).forEach(function(b){b.addEventListener('click',function(){$('typesModal').close();});});
    $('createType').addEventListener('click',async function(){var name=$('typeName').value.trim();if(!name)return toast('请输入类型名称',true);try{await api('addType',{name:name});$('typeName').value='';await load();renderTypes();toast('新增了资产分类');}catch(e){toast(e.message,true);}});
}
wire();load();
})();
