const STORAGE_KEY = 'moky-travel-diary-v1';

const defaultData = {
  trips: [
    {
      id: 't1',
      title: 'Weekend in Carmel',
      destination: 'Carmel-by-the-Sea, CA',
      start: '2026-08-14',
      end: '2026-08-16',
      notes: 'Beach walks, galleries, and good coffee.'
    }
  ],
  itinerary: [
    {
      id: 'i1',
      tripId: 't1',
      date: '2026-08-15',
      time: '10:00',
      title: 'Brunch at Stationæry',
      notes: 'Reservation for 2.'
    }
  ],
  diary: [
    {
      id: 'd1',
      tripId: 't1',
      date: '2026-08-15',
      title: 'First evening',
      text: 'The light here is unreal. We walked the beach at sunset and found the cutest cottage gallery.'
    }
  ],
  notes: [
    {
      id: 'n1',
      title: 'Packing list idea',
      text: 'Sun hat, linen pants, film camera, chargers, reusable water bottle.'
    }
  ]
};

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : { ...defaultData };
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

let data = loadData();

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${m}/${day}/${y}`;
}

function tripOptions() {
  return data.trips.map((t) => `<option value="${t.id}">${t.title}</option>`).join('');
}

function renderTrips() {
  const list = $('#trips-list');
  if (data.trips.length === 0) {
    list.innerHTML = '<div class="empty-state">No trips yet. Add one to get started.</div>';
    return;
  }
  list.innerHTML = data.trips
    .map(
      (t) => `
      <div class="card" data-id="${t.id}">
        <h3>${escapeHtml(t.title)}</h3>
        <div class="meta">${escapeHtml(t.destination)} · ${fmtDate(t.start)} – ${fmtDate(t.end)}</div>
        <p>${escapeHtml(t.notes || '')}</p>
        <div class="actions">
          <button class="btn btn-small btn-secondary" onclick="editTrip('${t.id}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteTrip('${t.id}')">Delete</button>
        </div>
      </div>
    `
    )
    .join('');
}

function renderItinerary() {
  const list = $('#itinerary-list');
  if (data.itinerary.length === 0) {
    list.innerHTML = '<div class="empty-state">No events yet.</div>';
    return;
  }
  const sorted = [...data.itinerary].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  list.innerHTML = sorted
    .map((i) => {
      const trip = data.trips.find((t) => t.id === i.tripId);
      return `
      <div class="row" data-id="${i.id}">
        <div class="time">${fmtDate(i.date)}<br>${i.time || ''}</div>
        <div class="content">
          <h4>${escapeHtml(i.title)} ${trip ? `<span style="font-weight:400;color:var(--muted)">· ${escapeHtml(trip.title)}</span>` : ''}</h4>
          <p>${escapeHtml(i.notes || '')}</p>
        </div>
        <div class="actions">
          <button class="btn btn-small btn-secondary" onclick="editEvent('${i.id}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteEvent('${i.id}')">Delete</button>
        </div>
      </div>
    `;
    })
    .join('');
}

function renderDiary() {
  const list = $('#diary-list');
  if (data.diary.length === 0) {
    list.innerHTML = '<div class="empty-state">No diary entries yet.</div>';
    return;
  }
  const sorted = [...data.diary].sort((a, b) => b.date.localeCompare(a.date));
  list.innerHTML = sorted
    .map((d) => {
      const trip = data.trips.find((t) => t.id === d.tripId);
      return `
      <div class="card" data-id="${d.id}">
        <div class="meta">${fmtDate(d.date)} ${trip ? '· ' + escapeHtml(trip.title) : ''}</div>
        <h3>${escapeHtml(d.title)}</h3>
        <p>${escapeHtml(d.text || '')}</p>
        <div class="actions">
          <button class="btn btn-small btn-secondary" onclick="editEntry('${d.id}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteEntry('${d.id}')">Delete</button>
        </div>
      </div>
    `;
    })
    .join('');
}

function renderNotes() {
  const list = $('#notes-list');
  if (data.notes.length === 0) {
    list.innerHTML = '<div class="empty-state">No notes yet.</div>';
    return;
  }
  list.innerHTML = data.notes
    .map(
      (n) => `
      <div class="row" data-id="${n.id}">
        <div class="content">
          <h4>${escapeHtml(n.title)}</h4>
          <p>${escapeHtml(n.text || '')}</p>
        </div>
        <div class="actions">
          <button class="btn btn-small btn-secondary" onclick="editNote('${n.id}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="deleteNote('${n.id}')">Delete</button>
        </div>
      </div>
    `
    )
    .join('');
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderAll() {
  renderTrips();
  renderItinerary();
  renderDiary();
  renderNotes();
}

// Modal helpers
let currentSaveHandler = null;

function openModal(title, fields, onSave) {
  $('#modal-title').textContent = title;
  $('#modal-form').innerHTML = fields;
  $('#modal').setAttribute('aria-hidden', 'false');
  currentSaveHandler = onSave;
}

function closeModal() {
  $('#modal').setAttribute('aria-hidden', 'true');
  $('#modal-form').innerHTML = '';
  currentSaveHandler = null;
}

function getFormValues() {
  const values = {};
  $('#modal-form').querySelectorAll('input, textarea, select').forEach((el) => {
    values[el.name] = el.value;
  });
  return values;
}

// Trips
$('#add-trip-btn').addEventListener('click', () => {
  openModal(
    'Add Trip',
    `
      <div class="form-group"><label>Title</label><input name="title" placeholder="e.g. Japan 2026" required></div>
      <div class="form-group"><label>Destination</label><input name="destination" placeholder="City, Country"></div>
      <div class="form-group"><label>Start date</label><input name="start" type="date"></div>
      <div class="form-group"><label>End date</label><input name="end" type="date"></div>
      <div class="form-group"><label>Notes</label><textarea name="notes" placeholder="Hotels, goals, vibe..."></textarea></div>
    `,
    (values) => {
      data.trips.push({ id: uid(), ...values });
      saveData(data);
      renderAll();
    }
  );
});

window.editTrip = (id) => {
  const t = data.trips.find((x) => x.id === id);
  openModal(
    'Edit Trip',
    `
      <div class="form-group"><label>Title</label><input name="title" value="${escapeHtml(t.title)}" required></div>
      <div class="form-group"><label>Destination</label><input name="destination" value="${escapeHtml(t.destination)}"></div>
      <div class="form-group"><label>Start date</label><input name="start" type="date" value="${escapeHtml(t.start)}"></div>
      <div class="form-group"><label>End date</label><input name="end" type="date" value="${escapeHtml(t.end)}"></div>
      <div class="form-group"><label>Notes</label><textarea name="notes">${escapeHtml(t.notes)}</textarea></div>
    `,
    (values) => {
      Object.assign(t, values);
      saveData(data);
      renderAll();
    }
  );
};

window.deleteTrip = (id) => {
  if (!confirm('Delete this trip?')) return;
  data.trips = data.trips.filter((x) => x.id !== id);
  data.itinerary = data.itinerary.filter((x) => x.tripId !== id);
  data.diary = data.diary.filter((x) => x.tripId !== id);
  saveData(data);
  renderAll();
};

// Itinerary
$('#add-event-btn').addEventListener('click', () => {
  openModal(
    'Add Event',
    `
      <div class="form-group"><label>Trip</label><select name="tripId">${tripOptions()}</select></div>
      <div class="form-group"><label>Date</label><input name="date" type="date"></div>
      <div class="form-group"><label>Time</label><input name="time" type="time"></div>
      <div class="form-group"><label>Title</label><input name="title" placeholder="e.g. Museum visit" required></div>
      <div class="form-group"><label>Notes</label><textarea name="notes" placeholder="Tickets, address, reminders..."></textarea></div>
    `,
    (values) => {
      data.itinerary.push({ id: uid(), ...values });
      saveData(data);
      renderAll();
    }
  );
});

window.editEvent = (id) => {
  const i = data.itinerary.find((x) => x.id === id);
  openModal(
    'Edit Event',
    `
      <div class="form-group"><label>Trip</label><select name="tripId">${tripOptions().replace(`value="${i.tripId}"`, `value="${i.tripId}" selected`)}</select></div>
      <div class="form-group"><label>Date</label><input name="date" type="date" value="${escapeHtml(i.date)}"></div>
      <div class="form-group"><label>Time</label><input name="time" type="time" value="${escapeHtml(i.time)}"></div>
      <div class="form-group"><label>Title</label><input name="title" value="${escapeHtml(i.title)}" required></div>
      <div class="form-group"><label>Notes</label><textarea name="notes">${escapeHtml(i.notes)}</textarea></div>
    `,
    (values) => {
      Object.assign(i, values);
      saveData(data);
      renderAll();
    }
  );
};

window.deleteEvent = (id) => {
  if (!confirm('Delete this event?')) return;
  data.itinerary = data.itinerary.filter((x) => x.id !== id);
  saveData(data);
  renderAll();
};

// Diary
$('#add-entry-btn').addEventListener('click', () => {
  openModal(
    'New Diary Entry',
    `
      <div class="form-group"><label>Trip</label><select name="tripId">${tripOptions()}</select></div>
      <div class="form-group"><label>Date</label><input name="date" type="date"></div>
      <div class="form-group"><label>Title</label><input name="title" placeholder="e.g. Day 3 in Kyoto" required></div>
      <div class="form-group"><label>Entry</label><textarea name="text" placeholder="What happened today?"></textarea></div>
    `,
    (values) => {
      data.diary.push({ id: uid(), ...values });
      saveData(data);
      renderAll();
    }
  );
});

window.editEntry = (id) => {
  const d = data.diary.find((x) => x.id === id);
  openModal(
    'Edit Entry',
    `
      <div class="form-group"><label>Trip</label><select name="tripId">${tripOptions().replace(`value="${d.tripId}"`, `value="${d.tripId}" selected`)}</select></div>
      <div class="form-group"><label>Date</label><input name="date" type="date" value="${escapeHtml(d.date)}"></div>
      <div class="form-group"><label>Title</label><input name="title" value="${escapeHtml(d.title)}" required></div>
      <div class="form-group"><label>Entry</label><textarea name="text">${escapeHtml(d.text)}</textarea></div>
    `,
    (values) => {
      Object.assign(d, values);
      saveData(data);
      renderAll();
    }
  );
};

window.deleteEntry = (id) => {
  if (!confirm('Delete this entry?')) return;
  data.diary = data.diary.filter((x) => x.id !== id);
  saveData(data);
  renderAll();
};

// Notes
$('#add-note-btn').addEventListener('click', () => {
  openModal(
    'Add Note',
    `
      <div class="form-group"><label>Title</label><input name="title" placeholder="e.g. Restaurants to try" required></div>
      <div class="form-group"><label>Note</label><textarea name="text" placeholder="Ideas, links, reminders..."></textarea></div>
    `,
    (values) => {
      data.notes.push({ id: uid(), ...values });
      saveData(data);
      renderAll();
    }
  );
});

window.editNote = (id) => {
  const n = data.notes.find((x) => x.id === id);
  openModal(
    'Edit Note',
    `
      <div class="form-group"><label>Title</label><input name="title" value="${escapeHtml(n.title)}" required></div>
      <div class="form-group"><label>Note</label><textarea name="text">${escapeHtml(n.text)}</textarea></div>
    `,
    (values) => {
      Object.assign(n, values);
      saveData(data);
      renderAll();
    }
  );
};

window.deleteNote = (id) => {
  if (!confirm('Delete this note?')) return;
  data.notes = data.notes.filter((x) => x.id !== id);
  saveData(data);
  renderAll();
};

// Modal controls
$('#modal-cancel').addEventListener('click', closeModal);
$('.modal-backdrop').addEventListener('click', closeModal);
$('#modal-save').addEventListener('click', () => {
  if (currentSaveHandler) {
    currentSaveHandler(getFormValues());
  }
  closeModal();
});

renderAll();
