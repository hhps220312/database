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

// 続柄の文字数を揃える関数
function formatRelation(rel) {
    switch(rel) {
        case '父': return ' 父 ';
        case '母': return ' 母 ';
        case '兄': return ' 兄 ';
        case '弟': return ' 弟 ';
        case '姉': return ' 姉 ';
        case '妹': return ' 妹 ';
        case '祖父': return '祖 父';
        case '祖母': return '祖 母';
        case '子': return ' 子 ';
        case '配偶者': return '配偶者';
        case 'その他': return 'その他';
        default: 
            if(!rel) return '   ';
            if(rel.length === 1) return ' ' + rel + ' ';
            if(rel.length === 2) return rel[0] + ' ' + rel[1];
            return rel;
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
    document.getElementById("nav-register-btn").innerText = "新規登録";
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

// 家族行の追加
window.addFamilyRow = function(relation = "", lastname = "", firstname = "", maidenname = "", oldName = "") {
    if (oldName && !lastname && !firstname) {
        lastname = oldName;
    }

    const container = document.getElementById("family-list");
    const div = document.createElement("div");
    div.className = "family-row";
    div.innerHTML = `
        <select class="classic-select family-relation">
            <option value="">続柄</option>
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
            <option value="その他" ${relation==='その他'?'selected':''}>その他</option>
        </select>
        <input type="text" class="family-lastname" placeholder="苗字" value="${lastname}" style="width: 100px;">
        <input type="text" class="family-firstname" placeholder="名前" value="${firstname}" style="width: 100px;">
        <input type="text" class="family-maidenname" placeholder="旧姓" value="${maidenname}" style="width: 100px;">
        <button type="button" onclick="this.parentElement.remove()">削除</button>
    `;
    container.appendChild(div);
}

// 保存
window.saveData = async function() {
    const docId = document.getElementById("edit-doc-id").value;
    
    const familyData = [];
    document.querySelectorAll(".family-row").forEach(row => {
        const relation = row.querySelector(".family-relation").value;
        const lastname = row.querySelector(".family-lastname").value;
        const firstname = row.querySelector(".family-firstname").value;
        const maidenname = row.querySelector(".family-maidenname").value;
        
        if(relation || lastname || firstname) {
            familyData.push({ relation, lastname, firstname, maidenname });
        }
    });

    const data = {
        studentId: document.getElementById("reg-id").value,
        lastname: document.getElementById("reg-lastname").value,
        lastnameKana: document.getElementById("reg-lastname-kana").value,
        firstname: document.getElementById("reg-firstname").value,
        firstnameKana: document.getElementById("reg-firstname-kana").value,
        gender: document.getElementById("reg-gender").value,
        blood: document.getElementById("reg-blood").value,
        birth: document.getElementById("reg-birth").value,
        address: document.getElementById("reg-address").value,
        photoUrl: document.getElementById("reg-photo-url").value,
        family: familyData,
        details: document.getElementById("reg-details").value,
        notes: document.getElementById("reg-notes").value,
        updatedAt: new Date()
    };

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

// 検索実行
window.searchData = async function() {
    const sId = document.getElementById("search-id").value;
    const sLast = document.getElementById("search-lastname").value;
    const sFirst = document.getElementById("search-firstname").value;
    const sGender = document.getElementById("search-gender").value;
    const sBlood = document.getElementById("search-blood").value;
    const sBirth = document.getElementById("search-birth").value;
    const sAddress = document.getElementById("search-address").value;
    const sKeyword = document.getElementById("search-keyword").value.toLowerCase();
    
    const q = query(collection(db, "persons"));
    const querySnapshot = await getDocs(q);
    
    const tbody = document.getElementById("result-body");
    tbody.innerHTML = ""; 

    let results = [];
    querySnapshot.forEach((doc) => {
        const d = doc.data();
        let match = true;
        
        // ★データが「数字」で保存されていてもフリーズしないように、全て「文字（String）」に変換してから検索
        const stId = String(d.studentId || "");
        const lName = String(d.lastname || "");
        const lKana = String(d.lastnameKana || "");
        const fName = String(d.firstname || "");
        const fKana = String(d.firstnameKana || "");
        const gender = String(d.gender || "");
        const blood = String(d.blood || "");
        const birth = String(d.birth || "");
        const addr = String(d.address || "");
        const det = String(d.details || "").toLowerCase();
        const not = String(d.notes || "").toLowerCase();
        
        if (sId && !stId.includes(sId)) match = false;
        
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
        if (sAddress && !addr.includes(sAddress)) match = false;
        
        if (sKeyword) {
            if (!det.includes(sKeyword) && !not.includes(sKeyword)) match = false;
        }

        if(match) {
            results.push({ docId: doc.id, ...d });
        }
    });

    // ★ソート時も必ず文字として扱うことでフリーズを防止
    results.sort((a, b) => {
        const idA = String(a.studentId || "");
        const idB = String(b.studentId || "");
        return idA.localeCompare(idB);
    });

    results.forEach(d => {
        const age = calculateAge(d.birth);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight:bold;">${d.studentId || '-'}</td>
            <td>${d.lastname || ''} ${d.firstname || ''}</td>
            <td>${d.gender || '-'}</td>
            <td>${age}</td>
            <td><button onclick="viewDetail('${encodeURIComponent(JSON.stringify(d))}')">表示</button></td>
        `;
        tbody.appendChild(tr);
    });

    if(results.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5'>該当するデータがありません</td></tr>";
    }
}

// Wiki風テキスト変換
function parseWiki(text) {
    if (!text) return "";
    let html = String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;"); // ここもフリーズ対策でString化
    html = html.replace(/== (.*?) ==/g, "<h3>$1</h3>");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\[\[(.*?)\]\]/g, "<a onclick=\"searchFromLink('$1')\">$1</a>");
    html = html.replace(/\n/g, "<br>");
    return html;
}

// 詳細画面の表示
window.viewDetail = async function(dataStr) {
    const data = JSON.parse(decodeURIComponent(dataStr));
    window.currentViewingData = data;
    
    document.getElementById("view-photo").src = data.photoUrl || "";
    document.getElementById("view-id-rank").innerText = `ID: ${data.studentId || '-'}`;
    document.getElementById("view-kana").innerText = `${data.lastnameKana || ''} ${data.firstnameKana || ''}`;
    document.getElementById("view-name").innerText = `${data.lastname || ''} ${data.firstname || ''}`;
    
    document.getElementById("view-gender").innerText = data.gender || '-';
    document.getElementById("view-blood").innerText = data.blood || '-';
    document.getElementById("view-birth").innerText = data.birth || '-';
    document.getElementById("view-age").innerText = calculateAge(data.birth);
    document.getElementById("view-address").innerText = data.address || '-';
    
    const famContainer = document.getElementById("view-family-container");
    const famList = document.getElementById("view-family-list");
    famList.innerHTML = "";
    
    if (data.family && Array.isArray(data.family) && data.family.length > 0) {
        famContainer.style.display = "block";
        famList.innerHTML = "<li>リンク確認中...</li>";
        
        try {
            const q = query(collection(db, "persons"));
            const querySnapshot = await getDocs(q);
            const allPersons = [];
            querySnapshot.forEach(doc => allPersons.push(doc.data()));

            famList.innerHTML = "";
            
            data.family.forEach(f => {
                const lName = f.lastname || f.name || "";
                const fName = f.firstname || "";
                const mName = f.maidenname || "";
                
                let displayName = "";
                if (mName) {
                    displayName = `${lName} ${fName} (旧姓: ${mName} ${fName})`;
                } else {
                    displayName = `${lName} ${fName}`;
                }
                displayName = displayName.trim();

                let hasLink = false;
                let linkLastname = "";
                let linkFirstname = "";

                for (let person of allPersons) {
                    if (person.studentId && person.studentId === data.studentId) continue;
                    
                    const pLast = person.lastname || "";
                    const pFirst = person.firstname || "";
                    
                    if (lName && fName && pLast === lName && pFirst === fName) {
                        hasLink = true; linkLastname = lName; linkFirstname = fName; break;
                    }
                    if (mName && fName && pLast === mName && pFirst === fName) {
                        hasLink = true; linkLastname = mName; linkFirstname = fName; break;
                    }
                    if (f.name && (pLast + " " + pFirst === f.name || pLast + pFirst === f.name)) {
                         hasLink = true; linkLastname = pLast; linkFirstname = pFirst; break;
                    }
                }
                
                const relText = formatRelation(f.relation);
                const li = document.createElement("li");
                
                if (hasLink) {
                    li.innerHTML = `【${relText}】 <a onclick="searchFromFamily('${linkLastname}', '${linkFirstname}')" style="cursor:pointer; color:blue; text-decoration:underline;">${displayName}</a>`;
                } else {
                    li.innerHTML = `【${relText}】 ${displayName}`;
                }
                famList.appendChild(li);
            });
        } catch(e) {
            console.error("家族リンクの取得に失敗:", e);
            famList.innerHTML = "<li>データの読み込みに失敗しました</li>";
        }
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
    
    document.getElementById("nav-register-btn").innerText = "編集中...";
    document.getElementById("edit-doc-id").value = d.docId;
    
    document.getElementById("reg-id").value = d.studentId || "";
    document.getElementById("reg-lastname").value = d.lastname || "";
    document.getElementById("reg-lastname-kana").value = d.lastnameKana || "";
    document.getElementById("reg-firstname").value = d.firstname || "";
    document.getElementById("reg-firstname-kana").value = d.firstnameKana || "";
    document.getElementById("reg-gender").value = d.gender || "女";
    document.getElementById("reg-blood").value = d.blood || "";
    document.getElementById("reg-birth").value = d.birth || "";
    document.getElementById("reg-address").value = d.address || "";
    document.getElementById("reg-photo-url").value = d.photoUrl || "";
    document.getElementById("reg-details").value = d.details || "";
    document.getElementById("reg-notes").value = d.notes || "";
    
    document.getElementById("family-list").innerHTML = "";
    if(d.family && Array.isArray(d.family)) {
        d.family.forEach(f => {
            addFamilyRow(f.relation, f.lastname, f.firstname, f.maidenname, f.name);
        });
    }
    
    showScreen('register-screen');
}

// 削除ボタン押下時
window.deleteCurrentData = async function() {
    const d = window.currentViewingData;
    if(!d) return;
    
    if(confirm(`本当に ${d.lastname} ${d.firstname} のデータを削除しますか？\nこの操作は取り消せません。`)) {
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

window.searchFromLink = function(name) {
    clearSearch();
    document.getElementById("search-lastname").value = name;
    showScreen('search-screen');
    searchData();
}

window.searchFromFamily = function(lastname, firstname) {
    clearSearch();
    document.getElementById("search-lastname").value = lastname;
    document.getElementById("search-firstname").value = firstname;
    showScreen('search-screen');
    searchData();
}
