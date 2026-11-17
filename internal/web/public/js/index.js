var layout;
var tabname;
var checksData = [];
var pendingCostId = null;

function setToday() {
    let today = new Date().toLocaleDateString('en-CA');
    layout = localStorage.getItem("layout");

    tabname = localStorage.getItem("tabname");
    if (tabname != 'weeks') {
        tabname = "checks"
    }

    createView(today);
}

function getGroupMap(checks) {
    const groupMap = new Map();
    let tmpChecks = [];

    let len = checks.length;

    for (let i = 0 ; i < len; i++) {
        if (groupMap.has(checks[i].Group)) {
            tmpChecks = groupMap.get(checks[i].Group);
        } else {
            tmpChecks = [];
        }
        tmpChecks.push(checks[i]);
        groupMap.set(checks[i].Group, tmpChecks);
    }

    let mapAsc = new Map([...groupMap.entries()].sort());

    return mapAsc
}

async function createView(date) {
    document.getElementById('realDate').value = date;
    document.getElementById('checkList').innerHTML = '';

    let groupMap = new Map();
    let checks = [];
    let url = '/date/'+tabname+'/'+date;

    checks = await (await fetch(url)).json();
    if (checks) {
        checksData = checks;
        groupMap = getGroupMap(checks);

        groupMap.forEach (function(value, key) {
            genHTML(key, value);
        })
    }
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function genHTML(gr, checks) {
    const isVert = layout == 'vert';
    const gridClass = isVert ? 'habit-grid layout-vert' : 'habit-grid';

    let tiles = '';
    const len = checks.length;

    for (let i = 0; i < len; i++) {
        const check = checks[i];
        const isDone = !!check.Count;
        const icon = check.Icon
            ? `<img src="${escapeHtml(check.Icon)}" class="habit-tile-icon" alt="" loading="lazy" onerror="this.style.display='none';">`
            : '';
        const tileAccent = check.Color ? `style="--tile-accent: ${escapeHtml(check.Color)};"` : '';

        tiles += `
            <div class="habit-tile${isDone ? ' is-done' : ''}" ${tileAccent} oncontextmenu="showMenu(event,${check.ID}, '${escapeHtml(check.Link)}');">
                <button id="btn${check.ID}" onclick="addOne(${check.ID});" class="habit-tile-main">
                    ${icon}
                    <span class="habit-tile-name">${escapeHtml(check.Name)}</span>
                </button>
                <button id="count${check.ID}" onclick="showMenu(event,${check.ID}, '${escapeHtml(check.Link)}');" class="habit-tile-count" title="Right-click for more options" aria-label="${escapeHtml(check.Name)} count: ${check.Count}. More options">
                    ${check.Count}
                </button>
            </div>`;
    }

    const html = `
        <div class="habit-group">
            <a href="/plan/?gr=${encodeURIComponent(gr)}" class="habit-group-title">${escapeHtml(gr)}</a>
            <div class="${gridClass}">${tiles}</div>
        </div>`;

    document.getElementById('checkList').insertAdjacentHTML('beforeend', html);
}

async function addOne(id) {
    const check = checksData.find(c => c.ID === id);
    if (check && check.HasCost) {
        pendingCostId = id;
        document.getElementById('costInput').value = '';
        new bootstrap.Modal(document.getElementById('costModal')).show();
        return;
    }
    await doAdd(id, 0);
}

async function doAdd(id, cost) {
    let url = '/add/'+tabname+'/'+id;
    if (cost > 0) url += '?cost=' + cost;
    const resp = await (await fetch(url)).json();

    document.getElementById('count'+id).innerHTML = resp;

    const tile = document.getElementById('btn'+id)?.closest('.habit-tile');
    if (tile) {
        tile.classList.toggle('is-done', resp > 0);
    }
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('costConfirm').addEventListener('click', async function () {
        const costVal = parseFloat(document.getElementById('costInput').value) || 0;
        bootstrap.Modal.getInstance(document.getElementById('costModal')).hide();
        if (pendingCostId !== null) {
            const id = pendingCostId;
            pendingCostId = null;
            await doAdd(id, costVal);
        }
    });
    document.getElementById('costModal').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') document.getElementById('costConfirm').click();
    });
});

function setFormDate(where) {
    dateStr = document.getElementById('realDate').value;

    if (where) {
        let year  = dateStr.substring(0,4);
        let month = dateStr.substring(5,7);
        let day   = dateStr.substring(8,10);
        var date  = new Date(year, month-1, day);

        date.setDate(date.getDate() + parseInt(where));
        let left = date.toLocaleDateString('en-CA');

        createView(left);
    } else {
        createView(dateStr);
    }
}

async function updatePlan() {
    date = document.getElementById('realDate').value;

    let resp = '';
    let url = '/update/'+tabname+'/'+date;
    resp = await (await fetch(url)).json();

    createView(date);
}

function toggleLayout() {

    if (layout == 'vert') {
        layout = '';
    } else {
        layout = 'vert';
    }
    localStorage.setItem("layout", layout);

    setToday();
}

function toggleTabname() {

    if (tabname == 'weeks') {
        tabname = 'checks';
    } else {
        tabname = 'weeks';
    }
    localStorage.setItem("tabname", tabname);

    setFormDate(0);
}

let activeMenu = null;

function removeMenu() {
    if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
    }
}

function showMenu(e, id, link) {
    let linkBtn = '';

    e.preventDefault();
    removeMenu();

    let menu = document.createElement("div");
    menu.id = "ctxmenu";
    menu.setAttribute('role', 'menu');
    menu.className = "btn-group-vertical";
    menu.style.position = "fixed";

    // position:fixed is relative to the viewport, so use clientX/clientY
    // (not pageX/pageY, which include scroll offset and would place the
    // menu off-target once the page has scrolled).
    const menuWidth = 200;
    const menuHeight = 130;
    let left = e.clientX;
    let top = e.clientY;
    if (left + menuWidth > window.innerWidth) left = Math.max(8, window.innerWidth - menuWidth - 8);
    if (top + menuHeight > window.innerHeight) top = Math.max(8, window.innerHeight - menuHeight - 8);

    menu.style.top = top + 'px';
    menu.style.left = left + 'px';

    if (link !== '') {
        linkBtn = `<button class="btn" role="menuitem" onclick="window.open('${escapeHtml(link)}', '_blank');">Open Link in a New Tab</button>`;
    }
    menu.innerHTML = linkBtn + `
        <button class="btn" role="menuitem" onclick="window.open('/stats/${tabname}/${id}', '_self');">Statistics</button>
        <button class="btn danger" role="menuitem" onclick="histDel(${id});">Reset Today's Counter</button>`;

    document.body.appendChild(menu);
    activeMenu = menu;

    setTimeout(() => {
        document.addEventListener('click', onOutsideClick, { once: true });
        document.addEventListener('touchstart', onOutsideClick, { once: true });
        document.addEventListener('keydown', onEscape);
        window.addEventListener('scroll', removeMenu, { once: true, passive: true });
    }, 0);
}

function onOutsideClick(e) {
    if (activeMenu && !activeMenu.contains(e.target)) removeMenu();
}

function onEscape(e) {
    if (e.key === 'Escape') {
        removeMenu();
        document.removeEventListener('keydown', onEscape);
    }
}

async function histDel(id) {
    removeMenu();

    let url = '/del/'+tabname+'/'+id;
    resp = await (await fetch(url));

    setFormDate(0);
}
