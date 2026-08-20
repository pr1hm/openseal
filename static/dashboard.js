async function loadDashboard() {
    try {
        const response = await fetch('/api/requests');
        const data = await response.json();

        const total = data.length;
        const pending = data.filter(d => d.status === 'pending').length;
        const completed = data.filter(d => d.status === 'signed').length;

        document.getElementById('stat-total').innerText = total;
        document.getElementById('stat-pending').innerText = pending;
        document.getElementById('stat-completed').innerText = completed;

        const tbody = document.getElementById('table-body');
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-gray-500">No Documents yet. Create one to get started!</td></tr>`;
            return;
        }

        data.forEach( doc => {
            const date = new Date(doc.created_at + "Z").toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'});

            let statusBadge = '';
            let actionButton = '';

            if (doc.status === 'pending') {
                statusBadge = `<span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold tracking-wide">PENDING</span>`;
                actionButton = `<button onclick="copyLink('${doc.id}')" class="text-blue-600 hover:text-blue-800 font-medium text-sm transition">Copy Link</button>`;
            } else {
                statusBadge = `<span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold tracking-wide">SIGNED</span>`;
                actionButton = `<a href="/static/signed_${doc.id}.pdf" target="_blank" class="text-green-600 hover:text-green-800 font-medium text-sm transition">View PDF</a>`;
            }

            const tr = document.createElement('tr');
            tr.className = "transition";
            tr.innerHTML = `
                <td class="p-5 font-medium text-gray-900">${doc.filename}</td>
                <td class=p-5 text-gray-500 text-sm">${date}</td>
                <td class="p-5">${statusBadge}</td>
                <td class="p-5 text-right">${actionButton}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.log("Failed to load dashboard:", err);
    }
}

function copyLink(docId) {
    const link = `${window.location.origin}/sign/${docId}`;
    navigator.clipboard.writeText(link).then(() => {
        alert("Signature link copied to clipboard!\n" + link);
    });
}

loadDashboard();