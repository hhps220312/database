import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBqR8bkOF0a7RaL_Rkaz7MIg56wcWfoZek",
    authDomain: "database-1c626.firebaseapp.com",
    projectId: "database-1c626",
    storageBucket: "database-1c626.firebasestorage.app",
    messagingSenderId: "815988357212",
    appId: "1:815988357212:web:e25569a811990059c34e99",
    measurementId: "G-8FHGC1J0EG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 年齢計算関数
function calculateAge(birthDateString) {
    if (!birthDateString) return "-";
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

// 人 or 人以外 モード切替
window.currentMode = 'person'; // デフォルト
window.changeMode = function(mode) {
    window.currentMode = mode;
    
    // モード切替時に検索結果と入力フォームをクリアする
    clearSearch();
    clearForm();

    if (mode === 'person') {
        document.body.classList.remove('mode-other');
        document.body.classList.add('mode-person');
        document.getElementById("nav-register-btn-text").innerText = "新規登録(人)";
    } else {
        document.body.classList.remove('mode-person');
        document.body.classList.add('mode-other');
        document.getElementById("nav-register-btn-text").innerText = "新規登録(人以外)";
    }
}

// 画面切り替え
window.showScreen = function(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    document.getElementById(screenId).style.display = 'block';
    
    if (screenId === 'register-screen' && !document.getElementById('edit-doc-id').value) {
        clearForm();
    }
}

// フォームクリア
function clearForm() {
    document.getElementById("edit-doc-id").value = "";
    document.querySelectorAll('#register-screen input[type="text"], #register-screen input[type="date"], #register-screen textarea').forEach(el => el.value = "");
    document.querySelectorAll('#register-screen select').forEach(el => el.selectedIndex = 0);
    document.getElementById("family-list").innerHTML = "";
    
    if (window.currentMode === 'person') {
        document.getElementById("nav-register-btn-text").innerText = "新規登録(人)";
    } else {
        document.getElementById("nav-register-btn-text").innerText = "新規登録(人以外)";
    }
}

// テキスト挿入
window.insertText = function(targetId, prefix, suffix) {
    const textarea = document.getElementById(targetId);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newText = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);
    textarea.value = newText;
    textarea.focus();
    textarea.selectionEnd = start + prefix.length;
}

// 関連のカスタム入力表示切替
window.toggleCustomRelation = function(selectElem) {
    const row = selectElem.closest('.family-row');
    const customRel = row.querySelector('.family-custom-relation');
    const personSpan = row.querySelector('.family-name-person');
    const otherSpan = row.querySelector('.family-name-other');
    const val = selectElem.value;

    if (val === 'その他' || val === '人以外') {
        customRel.style.display = 'inline-block';
    } else {
        customRel.style.display = 'none';
    }

    if (val === '人以外') {
        personSpan.style.display = 'none';
        otherSpan.style.display = 'inline-block';
    } else {
        personSpan.style.display = 'inline-block';
        otherSpan.style.display = 'none';
    }
}

// 関連情報の並び替え
window.moveUp = function(btn) {
    const row = btn.closest('.family-row');
    const prev = row.previousElementSibling;
    if (prev) row.parentNode.insertBefore(row, prev);
}
window.moveDown = function(btn) {
    const row = btn.closest('.family-row');
    const next = row.nextElementSibling;
    if (next) row.parentNode.insertBefore(next, row);
}

// 関連行の追加
window.addFamilyRow = function(relation = "", customRelation = "", lastname = "", firstname = "", otherName = "") {
    const container = document.getElementById("family-list");
    const div = document.createElement("div");
    div.className = "family-row";
    div.innerHTML = `
        <select class="classic-select family-relation" onchange="toggleCustomRelation(this)">
            <option value="" disabled hidden ${!relation ? 'selected' : ''}>続柄・関係</option>
            <option value="父" ${relation==='父'?'selected':''}>父</option>
            <option value="母" ${relation==='母'?'selected':''}>母</option>
            <option value="兄" ${relation==='兄'?'selected':''}>兄</option>
            <option value="弟" ${relation==='弟'?'selected':''}>弟</option>
            <option value="姉" ${relation==='姉'?'selected':''}>姉</option>
            <option value="妹" ${relation==='妹'?'selected':''}>妹</option>
            <option value="祖父" ${relation==='祖父'?'selected':''}>祖父</option>
            <option value="祖母" ${relation==='祖母'?'selected':''}>祖母</option>
            <option value="配偶者" ${relation==='配偶者'?'selected':''}>配偶者</option>
            <option value="子" ${relation==='子'?'selected':''}>子</option>
            <option value="友達" ${relation==='友達'?'selected':''}>友達</option>
            <option value="その他" ${relation==='その他'?'selected':''}>その他</option>
            <option value="人以外" ${relation==='人以外'?'selected':''}>人以外</option>
        </select>
        
        <input type="text" class="family-custom-relation" placeholder="関係(会社等)" value="${customRelation}" style="width: 90px; display: ${relation === 'その他' || relation === '人以外' ? 'inline-block' : 'none'};">

        <span class="family-name-person" style="display: ${relation === '人以外' ? 'none' : 'inline-block'};">
            <input type="text" class="family-lastname" placeholder="苗字" value="${lastname}" style="width: 85px;">
            <input type="text" class="family-firstname" placeholder="名前" value="${firstname}" style="width: 85px;">
        </span>
        
        <span class="family-name-other" style="display: ${relation === '人以外' ? 'inline-block' : 'none'};">
            <input type="text" class="family-othername" placeholder="名称" value="${otherName}" style="width: 175px;">
        </span>
        
        <button type="button" onclick="moveUp(this)" style="padding:2px 8px;">↑</button>
        <button type="button" onclick="moveDown(this)" style="padding:2px 8px;">↓</button>
        <button type="button" onclick="this.parentElement.remove()" style="padding:2px 8px;">削除</button>
    `;
    container.appendChild(div);
}

// 保存
window.saveData = async function() {
    const docId = document.getElementById("edit-doc-id").value;
    
    // 関連データの収集
    const familyData = [];
    document.querySelectorAll(".family-row").forEach(row => {
        const relation = row.querySelector(".family-relation").value;
        const customRelation = row.querySelector(".family-custom-relation").value;
        const lastname = row.querySelector(".family-lastname").value;
        const firstname = row.querySelector(".family-firstname").value;
        const otherName = row.querySelector(".family-othername").value;
        
        if(relation || lastname || firstname || otherName) {
            familyData.push({ relation, customRelation, lastname, firstname, otherName });
        }
    });

    const data = {
        type: window.currentMode, 
        studentId: document.getElementById("reg-id").value,
        address: document.getElementById("reg-address").value,
        family: familyData,
        details: document.getElementById("reg-details").value,
        notes: document.getElementById("reg-notes").value,
        updatedAt: new Date()
    };

    if (window.currentMode === 'person') {
        data.lastname = document.getElementById("reg-lastname").value;
        data.lastnameKana = document.getElementById("reg-lastname-kana").value;
        data.firstname = document.getElementById("reg-firstname").value;
        data.firstnameKana = document.getElementById("reg-firstname-kana").value;
        data.gender = document.getElementById("reg-gender").value;
        data.blood = document.getElementById("reg-blood").value;
        data.birth = document.getElementById("reg-birth").value;
        data.photoUrl = document.getElementById("reg-photo-url").value;
    } else {
        data.otherName = document.getElementById("reg-other-name").value;
        data.otherNameKana = document.getElementById("reg-other-name-kana").value;
    }

    try {
        if (docId) {
            await updateDoc(doc(db, "persons", docId), data);
            alert("更新しました！");
        } else {
            data.createdAt = new Date();
            await addDoc(collection(db, "persons"), data);
            alert("登録しました！");
        }
        clearForm();
        showScreen('search-screen');
        searchData();
    } catch (e) {
        console.error("エラー: ", e);
        alert("保存に失敗しました。");
    }
}

// 検索クリア
window.clearSearch = function() {
    document.querySelectorAll('#search-screen input').forEach(el => el.value = "");
    document.querySelectorAll('#search-screen select').forEach(el => el.selectedIndex = 0);
    document.getElementById("result-body").innerHTML = "";
}

function toHiragana(str) {
    return str.replace(/[ァ-ン]/g, function(s) {
       return String.fromCharCode(s.charCodeAt(0) - 0x60);
    });
}

// グローバルに検索結果を保持
window.searchResults = [];

// 検索実行
window.searchData = async function() {
    const sId = document.getElementById("search-id").value;
    const sLast = document.getElementById("search-lastname").value;
    const sFirst = document.getElementById("search-firstname").value;
    const sOther = document.getElementById("search-other-name").value;
    
    const sGender = document.getElementById("search-gender").value;
    const sBlood = document.getElementById("search-blood").value;
    const sBirth = document.getElementById("search-birth").value;
    const sAddress = document.getElementById("search-address").value;
    const sKeyword = document.getElementById("search-keyword").value.toLowerCase();
    
    const q = query(collection(db, "persons"));
    const querySnapshot = await getDocs(q);
    
    const thead = document.querySelector("#result-table thead");
    const tbody = document.getElementById("result-body");
    tbody.innerHTML = ""; 

    if (window.currentMode === 'person') {
        thead.innerHTML = "<tr><th>ID</th><th>氏名</th><th>性別</th><th>年齢</th><th>操作</th></tr>";
    } else {
        thead.innerHTML = "<tr><th>ID</th><th>名称</th><th>-</th><th>-</th><th>操作</th></tr>";
    }

    let results = [];
    querySnapshot.forEach((doc) => {
        const d = doc.data();
        const type = d.type || 'person'; 
        if (type !== window.currentMode) return; 
        
        let match = true;
        const stId = String(d.studentId || "");
        const lName = String(d.lastname || "");
        const lKana = String(d.lastnameKana || "");
        const fName = String(d.firstname || "");
        const fKana = String(d.firstnameKana || "");
        const oName = String(d.otherName || "");
        const oKana = String(d.otherNameKana || "");
        const gender = String(d.gender || "");
        const blood = String(d.blood || "");
        const birth = String(d.birth || "");
        const addr = String(d.address || "");
        const det = String(d.details || "").toLowerCase();
        const not = String(d.notes || "").toLowerCase();
        
        if (sId && !stId.includes(sId)) match = false;
        
        if (window.currentMode === 'person') {
            if (sLast) {
                const hiraQuery = toHiragana(sLast);
                if (!(lName.includes(sLast) || lKana.includes(hiraQuery))) match = false;
            }
            if (sFirst) {
                const hiraQuery = toHiragana(sFirst);
                if (!(fName.includes(sFirst) || fKana.includes(hiraQuery))) match = false;
            }
            if (sGender && gender !== sGender) match = false;
            if (sBlood && blood !== sBlood) match = false;
            if (sBirth && birth !== sBirth) match = false;
        } else {
            if (sOther) {
                const hiraQuery = toHiragana(sOther);
                if (!(oName.includes(sOther) || oKana.includes(hiraQuery))) match = false;
            }
        }
        
        if (sAddress && !addr.includes(sAddress)) match = false;
        if (sKeyword) {
            if (!det.includes(sKeyword) && !not.includes(sKeyword)) match = false;
        }

        if(match) {
            results.push({ docId: doc.id, ...d });
        }
    });

    results.sort((a, b) => {
        const idA = String(a.studentId || "");
        const idB = String(b.studentId || "");
        return idA.localeCompare(idB);
    });

    window.searchResults = results; 

    results.forEach((d, index) => {
        const tr = document.createElement("tr");
        if (window.currentMode === 'person') {
            const age = calculateAge(d.birth);
            tr.innerHTML = `
                <td style="font-weight:bold;">${d.studentId || '-'}</td>
                <td>${d.lastname || ''} ${d.firstname || ''}</td>
                <td>${d.gender || '-'}</td>
                <td>${age}</td>
                <td><button onclick="viewDetail(${index})">表示</button></td>
            `;
        } else {
            tr.innerHTML = `
                <td style="font-weight:bold;">${d.studentId || '-'}</td>
                <td>${d.otherName || ''}</td>
                <td>-</td>
                <td>-</td>
                <td><button onclick="viewDetail(${index})">表示</button></td>
            `;
        }
        tbody.appendChild(tr);
    });

    if(results.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5'>該当するデータがありません</td></tr>";
    }
}

// Wiki風テキスト変換
function parseWiki(text) {
    if (!text) return "";
    let html = String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(/== (.*?) ==/g, "<h3>$1</h3>");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\[\[(.*?)\]\]/g, "<a onclick=\"searchFromLink('$1')\">$1</a>");
    html = html.replace(/\n/g, "<br>");
    return html;
}

// 詳細画面の表示
window.viewDetail = async function(index) {
    const data = window.searchResults[index];
    if (!data) return;
    
    window.currentViewingData = data;
    const type = data.type || 'person';
    
    document.getElementById("view-id-rank").innerText = `ID: ${data.studentId || '-'}`;
    
    if (type === 'person') {
        document.getElementById("view-photo").src = data.photoUrl || "";
        document.getElementById("view-kana").innerText = `${data.lastnameKana || ''} ${data.firstnameKana || ''}`;
        document.getElementById("view-name").innerText = `${data.lastname || ''} ${data.firstname || ''}`;
        document.getElementById("view-gender").innerText = data.gender || '-';
        document.getElementById("view-blood").innerText = data.blood || '-';
        document.getElementById("view-birth").innerText = data.birth || '-';
        document.getElementById("view-age").innerText = calculateAge(data.birth);
    } else {
        document.getElementById("view-kana").innerText = data.otherNameKana || '';
        document.getElementById("view-name").innerText = data.otherName || '';
        document.getElementById("view-gender").innerText = '-';
        document.getElementById("view-blood").innerText = '-';
        document.getElementById("view-birth").innerText = '-';
        document.getElementById("view-age").innerText = '-';
    }
    
    document.getElementById("view-address").innerText = data.address || '-';
    
    const famContainer = document.getElementById("view-family-container");
    const famList = document.getElementById("view-family-list");
    famList.innerHTML = "";
    
    if (data.family && Array.isArray(data.family) && data.family.length > 0) {
        famContainer.style.display = "block";
        famList.innerHTML = "";
        
        data.family.forEach(f => {
            // 表示用の関係性
            let relText = "";
            if (f.relation === 'その他' || f.relation === '人以外') {
                relText = f.customRelation || f.relation;
            } else {
                relText = f.relation || '関連';
            }

            // 無条件でリンクを生成
            const li = document.createElement("li");
            if (f.relation === '人以外') {
                const displayName = f.otherName || "";
                li.innerHTML = `【${relText}】 <a onclick="searchFromFamily('${displayName}', '', 'other')" style="cursor:pointer; color:blue; text-decoration:underline;">${displayName}</a>`;
            } else {
                const displayName = `${f.lastname || ''} ${f.firstname || ''}`.trim();
                li.innerHTML = `【${relText}】 <a onclick="searchFromFamily('${f.lastname || ''}', '${f.firstname || ''}', 'person')" style="cursor:pointer; color:blue; text-decoration:underline;">${displayName}</a>`;
            }
            famList.appendChild(li);
        });
    } else {
        famContainer.style.display = "none";
    }
    
    const detContainer = document.getElementById("view-details-container");
    if (data.details) {
        document.getElementById("view-details").innerHTML = parseWiki(data.details);
        detContainer.style.display = "block";
    } else {
        detContainer.style.display = "none";
    }

    const noteContainer = document.getElementById("view-notes-container");
    if (data.notes) {
        document.getElementById("view-notes").innerHTML = parseWiki(data.notes);
        noteContainer.style.display = "block";
    } else {
        noteContainer.style.display = "none";
    }

    showScreen('detail-screen');
}

// 編集ボタン押下時
window.editCurrentData = function() {
    const d = window.currentViewingData;
    if(!d) return;
    
    changeMode(d.type || 'person');
    
    document.getElementById("nav-register-btn-text").innerText = "編集中...";
    document.getElementById("edit-doc-id").value = d.docId;
    
    document.getElementById("reg-id").value = d.studentId || "";
    document.getElementById("reg-address").value = d.address || "";
    document.getElementById("reg-details").value = d.details || "";
    document.getElementById("reg-notes").value = d.notes || "";
    
    if (window.currentMode === 'person') {
        document.getElementById("reg-lastname").value = d.lastname || "";
        document.getElementById("reg-lastname-kana").value = d.lastnameKana || "";
        document.getElementById("reg-firstname").value = d.firstname || "";
        document.getElementById("reg-firstname-kana").value = d.firstnameKana || "";
        document.getElementById("reg-gender").value = d.gender || "不明";
        document.getElementById("reg-blood").value = d.blood || "不明";
        document.getElementById("reg-birth").value = d.birth || "";
        document.getElementById("reg-photo-url").value = d.photoUrl || "";
    } else {
        document.getElementById("reg-other-name").value = d.otherName || "";
        document.getElementById("reg-other-name-kana").value = d.otherNameKana || "";
    }
    
    document.getElementById("family-list").innerHTML = "";
    if(d.family && Array.isArray(d.family)) {
        d.family.forEach(f => {
            addFamilyRow(f.relation, f.customRelation, f.lastname, f.firstname, f.otherName);
        });
    }
    
    showScreen('register-screen');
}

// 削除ボタン押下時
window.deleteCurrentData = async function() {
    const d = window.currentViewingData;
    if(!d) return;
    
    const nameStr = (d.type === 'person') ? `${d.lastname} ${d.firstname}` : d.otherName;
    if(confirm(`本当に ${nameStr} のデータを削除しますか？\nこの操作は取り消せません。`)) {
        try {
            await deleteDoc(doc(db, "persons", d.docId));
            alert("削除しました。");
            showScreen('search-screen');
            searchData();
        } catch(e) {
            console.error(e);
            alert("削除に失敗しました。");
        }
    }
}

// リンクテキスト（[[文字列]]）をクリックした時
window.searchFromLink = function(text) {
    clearSearch();
    if (text.includes(" ")) {
        const parts = text.split(" ");
        changeMode('person');
        document.getElementById("search-lastname").value = parts[0];
        document.getElementById("search-firstname").value = parts.slice(1).join(" ");
    } else {
        changeMode('person');
        document.getElementById("search-lastname").value = text;
        document.getElementById("search-other-name").value = text; 
    }
    showScreen('search-screen');
    searchData();
}

// 関連情報のリンクから検索
window.searchFromFamily = function(val1, val2, mode = 'person') {
    clearSearch();
    changeMode(mode);
    if (mode === 'person') {
        document.getElementById("search-lastname").value = val1;
        document.getElementById("search-firstname").value = val2;
    } else {
        document.getElementById("search-other-name").value = val1;
    }
    showScreen('search-screen');
    searchData();
}
