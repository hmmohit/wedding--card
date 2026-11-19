import { useEffect, useState } from "react";
import axios from "axios";
import { Link, Route, Routes } from "react-router-dom";
import "./App.css";
import InvitationEditor from "./pages/InvitationEditor.jsx";
import { GuestInvitation, PublicInvitation } from "./pages/InvitationPages.jsx";

const API = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname)
  ? "http://127.0.0.1:8000/api"
  : "/api";
// Set this to false to restore the login requirement on local development hosts.
const LOCAL_ADMIN_BYPASS_ENABLED = true;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function AdminDashboard() {
  const LOCAL_DEV_MODE =
    import.meta.env.DEV &&
    LOCAL_ADMIN_BYPASS_ENABLED &&
    LOOPBACK_HOSTS.has(window.location.hostname);
  const [token, setToken] = useState(
    LOCAL_DEV_MODE ? "" : localStorage.getItem("admin_token") || ""
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [weddings, setWeddings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [selectedWedding, setSelectedWedding] = useState(null);
  const [events, setEvents] = useState([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventMusicFile, setEventMusicFile] = useState(null);
  const [eventMusicPreview, setEventMusicPreview] = useState("");
  const [removeEventMusic, setRemoveEventMusic] = useState(false);


  const [eventForm, setEventForm] = useState({
    event_name: "",
    event_name_bn: "",
    description: "",
    description_bn: "",
    event_date: "",
    venue: "",
    venue_bn: "",
    address: "",
    address_bn: "",
    map_url: "",
    music_title: "",
    music_artist: "",
    music_enabled: false,
    music_url: "",
    sort_order: 0,
  });

  // GUEST MANAGEMENT
  const [selectedGuestWedding, setSelectedGuestWedding] = useState(null);
  const [guests, setGuests] = useState([]);
  const [rsvpSummary, setRsvpSummary] = useState(null);

  const [guestForm, setGuestForm] = useState({
    name: "",
    phone: "",
    group_name: "",
    allowed_guests: 1,
  });

  const [form, setForm] = useState({
    title: "",
    slug: "",
    bride_name: "",
    groom_name: "",
    bride_father: "",
    bride_mother: "",
    groom_father: "",
    groom_mother: "",
    invitation_message: "",
  });

  useEffect(() => () => {
    if (eventMusicPreview.startsWith("blob:")) URL.revokeObjectURL(eventMusicPreview);
  }, [eventMusicPreview]);

  const authConfig = token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : {};

  async function loadWeddings(currentToken = token) {
    try {
      const headers = currentToken
        ? { Authorization: `Bearer ${currentToken}` }
        : undefined;
      const response = await axios.get(`${API}/admin/weddings`, { headers });
      setWeddings(response.data);
    } catch {
      setError("Could not load weddings. Please log in again.");
    }
  }

  useEffect(() => {
    if (!LOCAL_DEV_MODE && !token) return undefined;

    let active = true;

    async function loadInitialWeddings() {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const response = await axios.get(`${API}/admin/weddings`, { headers });
        if (active) setWeddings(response.data);
      } catch {
        if (active) {
          setError("Could not load weddings. Please log in again.");
          if (!LOCAL_DEV_MODE) {
            localStorage.removeItem("admin_token");
            setToken("");
            setWeddings([]);
          }
        }
      }
    }

    void loadInitialWeddings();
    return () => {
      active = false;
    };
  }, [LOCAL_DEV_MODE, token]);

  async function login(e) {
    if (LOCAL_DEV_MODE) return;
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loginResponse = await axios.post(`${API}/admin/login`, {
        email,
        password,
      });

      const issuedToken = loginResponse.data.token;
      const dashboardResponse = await axios.get(`${API}/admin/weddings`, {
        headers: { Authorization: `Bearer ${issuedToken}` },
      });

      localStorage.setItem("admin_token", issuedToken);
      setWeddings(dashboardResponse.data);
      setToken(issuedToken);
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Login succeeded, but admin access could not be verified. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (LOCAL_DEV_MODE) return;

    try {
      await axios.post(`${API}/admin/logout`, {}, authConfig);
    } catch {
      // Clear the local session even if the server request fails.
    }

    localStorage.removeItem("admin_token");
    setToken("");
    setWeddings([]);
  }

  function updateField(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function createWedding(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const weddingData = {
        title: form.title,
        slug: form.slug || undefined,
        bride_name: form.bride_name,
        groom_name: form.groom_name,
        content: {
          bride_father: form.bride_father,
          bride_mother: form.bride_mother,
          groom_father: form.groom_father,
          groom_mother: form.groom_mother,
          invitation_message: form.invitation_message,
        },
      };

      await axios.post(`${API}/admin/weddings`, weddingData, authConfig);

      setSuccess("Wedding created successfully!");
      setForm({
        title: "",
        slug: "",
        bride_name: "",
        groom_name: "",
        bride_father: "",
        bride_mother: "",
        groom_father: "",
        groom_mother: "",
        invitation_message: "",
      });
      setShowForm(false);
      await loadWeddings();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        JSON.stringify(err.response?.data?.errors || "Could not create wedding.")
      );
    }
  }

  async function openEvents(wedding) {
    setSelectedWedding(wedding);
    setShowEventForm(false);
    setEditingEventId(null);
    setError("");
    setSuccess("");

    try {
      const response = await axios.get(
        `${API}/admin/weddings/${wedding.id}/events`,
        authConfig
      );
      setEvents(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load events.");
    }
  }

  async function saveEvent(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const eventResponse = editingEventId
        ? await axios.put(`${API}/admin/weddings/${selectedWedding.id}/events/${editingEventId}`, eventForm, authConfig)
        : await axios.post(`${API}/admin/weddings/${selectedWedding.id}/events`, eventForm, authConfig);
      const savedEvent = eventResponse.data.event;
      setEditingEventId(savedEvent.id);

      if (eventMusicFile) {
        const upload = new FormData();
        upload.append("file", eventMusicFile);
        upload.append("music_title", eventForm.music_title || eventForm.event_name);
        upload.append("music_artist", eventForm.music_artist || "");
        upload.append("music_enabled", eventForm.music_enabled ? "1" : "0");
        await axios.post(`${API}/admin/weddings/${selectedWedding.id}/events/${savedEvent.id}/music`, upload, authConfig);
      } else if (removeEventMusic && editingEventId) {
        await axios.delete(`${API}/admin/weddings/${selectedWedding.id}/events/${savedEvent.id}/music`, authConfig);
      }

      setSuccess("Event saved successfully!");
      setEventForm({
        event_name: "",
        event_name_bn: "",
        description: "",
        description_bn: "",
        event_date: "",
        venue: "",
        venue_bn: "",
        address: "",
        address_bn: "",
        map_url: "",
        music_title: "",
        music_artist: "",
        music_enabled: false,
        music_url: "",
        sort_order: events.length + 1,
      });
      setEventMusicFile(null);
      setEventMusicPreview("");
      setRemoveEventMusic(false);
      setShowEventForm(false);
      setEditingEventId(null);
      await openEvents(selectedWedding);
    } catch (err) {
      setError(
        JSON.stringify(err.response?.data?.errors || err.response?.data?.message || "Could not save event.")
      );
    }
  }

  function selectEventMusic(file) {
    setEventMusicFile(file || null);
    setEventMusicPreview(file ? URL.createObjectURL(file) : "");
    setRemoveEventMusic(false);
    if (file) {
      setEventForm((current) => ({ ...current, music_enabled: true, music_title: current.music_title || current.event_name }));
    }
  }

  function clearEventMusic() {
    setEventMusicFile(null);
    setEventMusicPreview("");
    setEventForm((current) => ({ ...current, music_url: "", music_enabled: false }));
    setRemoveEventMusic(true);
  }

  async function deleteEvent(eventId) {
    if (!window.confirm("Are you sure you want to delete this event?")) return;

    try {
      await axios.delete(
        `${API}/admin/weddings/${selectedWedding.id}/events/${eventId}`,
        authConfig
      );
      setSuccess("Event deleted successfully.");
      const response = await axios.get(
        `${API}/admin/weddings/${selectedWedding.id}/events`,
        authConfig
      );
      setEvents(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete event.");
    }
  }

  // GUEST MANAGEMENT FUNCTIONS

  const loadGuests = async (weddingId) => {
    try {
      const response = await axios.get(
        `${API}/admin/weddings/${weddingId}/guests`,
        authConfig
      );

      setSelectedGuestWedding(weddingId);
      const summary = await axios.get(`${API}/admin/weddings/${weddingId}/rsvp-summary`, authConfig);
      setRsvpSummary(summary.data);
      setGuests(summary.data.guests || response.data);
    } catch {
      alert("Could not load guests.");
    }
  };

  const importGuests = async (file) => {
    if (!file) return;
    const data = new FormData(); data.append("file", file);
    try {
      const response = await axios.post(`${API}/admin/weddings/${selectedGuestWedding}/guests/import`, data, authConfig);
      alert(`Imported ${response.data.imported}; skipped ${response.data.skipped}.`);
      await loadGuests(selectedGuestWedding);
    } catch (err) { alert(err.response?.data?.message || "Could not import guests."); }
  };

  const editGuest = async (guest) => {
    const name = window.prompt("Guest name", guest.name); if (!name) return;
    const phone = window.prompt("Phone number", guest.phone || "");
    if (phone === null) return;
    const group_name = window.prompt("Group name", guest.group_name || "");
    if (group_name === null) return;
    const allowed_guests = Number(window.prompt("Allowed guest count", guest.allowed_guests));
    try {
      await axios.put(`${API}/admin/weddings/${selectedGuestWedding}/guests/${guest.id}`, { name, phone, group_name, allowed_guests }, authConfig);
      await loadGuests(selectedGuestWedding);
    } catch (err) { alert(err.response?.data?.message || "Could not update guest."); }
  };

  const addGuest = async (e) => {
    e.preventDefault();

    try {
      await axios.post(
        `${API}/admin/weddings/${selectedGuestWedding}/guests`,
        guestForm,
        authConfig
      );

      setGuestForm({
        name: "",
        phone: "",
        group_name: "",
        allowed_guests: 1,
      });

      loadGuests(selectedGuestWedding);
      alert("Guest added successfully!");
    } catch (error) {
      alert(error.response?.data?.message || "Could not add guest.");
    }
  };

  const deleteGuest = async (guestId) => {
    if (!window.confirm("Are you sure you want to delete this guest?")) {
      return;
    }

    try {
      await axios.delete(
        `${API}/admin/weddings/${selectedGuestWedding}/guests/${guestId}`,
        authConfig
      );

      loadGuests(selectedGuestWedding);
    } catch {
      alert("Could not delete guest.");
    }
  };

  if (!token && !LOCAL_DEV_MODE) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={login}>
          <div className="brand-icon">✦</div>
          <p className="eyebrow">WEDDING INVITATION PLATFORM</p>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to manage your wedding invitations.</p>

          {error && <div className="error">{error}</div>}

          <label>Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@example.com"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />

          <button className="primary-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign in to dashboard"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-brand">✦ Wedding Studio</div>
        <div className="sidebar-label">WORKSPACE</div>
        <div className="sidebar-link active">▦ &nbsp; Weddings</div>
        <div className="sidebar-footer">
          <button
            className="logout-button"
            onClick={logout}
            style={LOCAL_DEV_MODE ? { display: "none" } : undefined}
          >
            ↪ Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span>Wedding Management</span>
          <span className="admin-label">Administrator</span>
        </header>

        <section className="page-heading">
          <div>
            <p className="eyebrow">YOUR WORKSPACE</p>
            <h1>Wedding invitations</h1>
            <p className="muted">
              Create and manage personalized wedding experiences.
            </p>
          </div>
          <button
            className="primary-button create-button"
            onClick={() => setShowForm(!showForm)}
           
          >
            + Create wedding
          </button>
        </section>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {showForm && (
          <form className="wedding-form" onSubmit={createWedding}>
            <h2>Create a wedding</h2>
            <p className="muted">
              All these details can be changed later from your admin panel.
            </p>

            <div className="form-grid">
              <div>
                <label>Wedding title *</label>
                <input name="title" value={form.title} onChange={updateField} required placeholder="Mohit & Ayesha Wedding" />
              </div>
              <div>
                <label>Invitation URL slug (optional)</label>
                <input name="slug" value={form.slug} onChange={updateField} placeholder="mohit-ayesha" />
              </div>
              <div>
                <label>Groom's name</label>
                <input name="groom_name" value={form.groom_name} onChange={updateField} placeholder="Groom's name" />
              </div>
              <div>
                <label>Bride's name</label>
                <input name="bride_name" value={form.bride_name} onChange={updateField} placeholder="Bride's name" />
              </div>
              <div>
                <label>Groom's father</label>
                <input name="groom_father" value={form.groom_father} onChange={updateField} />
              </div>
              <div>
                <label>Groom's mother</label>
                <input name="groom_mother" value={form.groom_mother} onChange={updateField} />
              </div>
              <div>
                <label>Bride's father</label>
                <input name="bride_father" value={form.bride_father} onChange={updateField} />
              </div>
              <div>
                <label>Bride's mother</label>
                <input name="bride_mother" value={form.bride_mother} onChange={updateField} />
              </div>
            </div>

            <label>Invitation message (Bengali or English)</label>
            <textarea
              name="invitation_message"
              value={form.invitation_message}
              onChange={updateField}
              rows="4"
              placeholder="Write your wedding invitation message..."
             
            />

            <div className="form-actions">
              <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button className="primary-button">Save wedding</button>
            </div>
          </form>
        )}

        {selectedGuestWedding && (
          <section className="wedding-form event-manager">
            <div className="section-heading">
              <div>
                <h2>
                  Guests — {weddings.find(w => w.id === selectedGuestWedding)?.title}
                </h2>
                <p className="muted">
                  Add guests and manage their personalized invitation links.
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSelectedGuestWedding(null);
                  setGuests([]);
                }}
              >
                Close
              </button>
            </div>

            <form className="wedding-form" onSubmit={addGuest}>
              <h3>Add a guest</h3>

              <label>Guest name *</label>
              <input
                value={guestForm.name}
                onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
                placeholder="Guest full name"
                required
               
              />

              <label>Phone number</label>
              <input
                value={guestForm.phone}
                onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                placeholder="01XXXXXXXXX"
               
              />

              <label>Group name</label>
              <input
                value={guestForm.group_name}
                onChange={(e) => setGuestForm({ ...guestForm, group_name: e.target.value })}
                placeholder="Family / Friends / Colleagues"
               
              />

              <label>Allowed guests</label>
              <input
                type="number"
                min="1"
                value={guestForm.allowed_guests}
                onChange={(e) => setGuestForm({ ...guestForm, allowed_guests: Number(e.target.value) })}
               
              />

              <button type="submit" className="primary-button">
                + Add guest
              </button>
              <label className="import-guests">Import guests from CSV<input type="file" accept=".csv,text/csv" onChange={(e) => { importGuests(e.target.files?.[0]); e.target.value = ""; }} /></label>
            </form>

            {rsvpSummary && <div className="rsvp-summary"><h3>RSVP overview</h3><p>Invited: {rsvpSummary.total_invited} · Confirmed: {rsvpSummary.confirmed} · Declined: {rsvpSummary.declined} · Pending: {rsvpSummary.pending} · Confirmed attendees: {rsvpSummary.confirmed_attendees}</p></div>}

            <h3>Guest list ({guests.length})</h3>

            {guests.length === 0 ? (
              <div className="empty-state">
                <p>No guests added yet.</p>
              </div>
            ) : (
              <div className="wedding-grid">
                {guests.map((guest) => (
                  <article className="wedding-card" key={guest.id}>
                    <h3>{guest.name}</h3>
                    <p>{guest.phone || "No phone number"}</p>
                    <p>Group: {guest.group_name || "Not specified"}</p>
                    <p>Allowed guests: {guest.allowed_guests}</p>
                    <p>First viewed: {guest.first_viewed_at ? new Date(guest.first_viewed_at).toLocaleString() : "Not viewed"}</p>
                    <p>RSVP: {guest.rsvp?.status || "Pending"}{guest.rsvp?.attending_count ? ` · ${guest.rsvp.attending_count} attending` : ""}</p>
                    {guest.rsvp?.message && <p>Message: {guest.rsvp.message}</p>}

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        const link = `${window.location.origin}/guest-invitation/${guest.invitation_token}`;
                        navigator.clipboard.writeText(link);
                        alert("Invitation link copied!");
                      }}
                     
                    >
                      Copy invitation link
                    </button>

                    <button type="button" className="secondary-button" onClick={() => editGuest(guest)}>Edit guest</button>
                    <button type="button" className="secondary-button" onClick={() => { const link = `${window.location.origin}/guest-invitation/${guest.invitation_token}`; const text = encodeURIComponent(`Dear ${guest.name}, you are invited: ${link}`); window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer"); }}>Share on WhatsApp</button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => deleteGuest(guest.id)}
                     
                    >
                      Delete guest
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedWedding && (
          <section className="wedding-form event-manager">
            <div className="section-heading">
              <div>
                <h2>Events — {selectedWedding.title}</h2>
                <p className="muted">Manage Gaye Holud, Nikah, Walima and other events. All text is editable here in the admin panel.</p>
              </div>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSelectedWedding(null);
                  setEvents([]);
                  setShowEventForm(false);
                }}
              >
                Close
              </button>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setEditingEventId(null);
                setEventMusicFile(null);
                setEventMusicPreview("");
                setRemoveEventMusic(false);
                setEventForm({
                  event_name: "",
                  event_name_bn: "",
                  description: "",
                  description_bn: "",
                  event_date: "",
                  venue: "",
                  venue_bn: "",
                  address: "",
                  address_bn: "",
                  map_url: "",
                  music_title: "",
                  music_artist: "",
                  music_enabled: false,
                  music_url: "",
                  sort_order: events.length + 1,
                });
                setShowEventForm(true);
              }}
             
            >
              + Add event
            </button>

            {showEventForm && (
              <form className="wedding-form" onSubmit={saveEvent}>
                <h3>{editingEventId ? "Edit wedding event" : "Add wedding event"}</h3>
                <label>Event name *</label>
                <input
                  value={eventForm.event_name}
                  onChange={(e) => setEventForm({ ...eventForm, event_name: e.target.value })}
                  placeholder="Gaye Holud / Nikah / Walima"
                  required
                 
                />

                <label>Google Maps link</label>
                <input type="url" value={eventForm.map_url} onChange={(e) => setEventForm({ ...eventForm, map_url: e.target.value })} placeholder="https://maps.google.com/..." />

                <fieldset className="event-music-fields">
                  <legend>Event music (optional)</legend>
                  <p className="muted">Choose an audio file to preview it before saving. Uploading another track replaces the current one.</p>
                  <div className="form-grid">
                    <div><label>Music title</label><input value={eventForm.music_title} onChange={(e) => setEventForm({ ...eventForm, music_title: e.target.value })} placeholder={eventForm.event_name || "Track title"} /></div>
                    <div><label>Artist name (optional)</label><input value={eventForm.music_artist} onChange={(e) => setEventForm({ ...eventForm, music_artist: e.target.value })} placeholder="Artist" /></div>
                  </div>
                  <label>Upload or replace track (MP3 preferred, up to 20 MB)</label>
                  <input type="file" accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/aac" onChange={(e) => selectEventMusic(e.target.files?.[0])} />
                  {(eventMusicPreview || eventForm.music_url) && <audio className="admin-audio-preview" controls preload="metadata" src={eventMusicPreview || eventForm.music_url}>Audio preview is not supported by this browser.</audio>}
                  <label className="event-music-toggle"><input type="checkbox" checked={Boolean(eventForm.music_enabled)} disabled={!(eventMusicPreview || eventForm.music_url)} onChange={(e) => setEventForm({ ...eventForm, music_enabled: e.target.checked })} /> Enable this event's music on the invitation</label>
                  {(eventMusicPreview || eventForm.music_url) && <button type="button" className="secondary-button" onClick={clearEventMusic}>Remove event music</button>}
                </fieldset>

                <label>Description</label>
                <textarea
                  rows="3"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Write event details..."
                 
                />

                <label>Event name (বাংলা)</label>
                <input value={eventForm.event_name_bn} onChange={(e) => setEventForm({ ...eventForm, event_name_bn: e.target.value })} lang="bn" />
                <label>Description (বাংলা)</label>
                <textarea rows="3" value={eventForm.description_bn} onChange={(e) => setEventForm({ ...eventForm, description_bn: e.target.value })} lang="bn" />

                <label>Date and time</label>
                <input
                  type="datetime-local"
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                 
                />

                <label>Venue</label>
                <input
                  value={eventForm.venue}
                  onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                  placeholder="Venue name"
                 
                />

                <label>Venue (বাংলা)</label>
                <input value={eventForm.venue_bn} onChange={(e) => setEventForm({ ...eventForm, venue_bn: e.target.value })} lang="bn" />

                <label>Full address</label>
                <textarea
                  rows="2"
                  value={eventForm.address}
                  onChange={(e) => setEventForm({ ...eventForm, address: e.target.value })}
                  placeholder="Full venue address"
                 
                />
                <label>Full address (বাংলা)</label>
                <textarea rows="2" value={eventForm.address_bn} onChange={(e) => setEventForm({ ...eventForm, address_bn: e.target.value })} lang="bn" />

                <div className="form-actions">
                  <button type="button" className="secondary-button" onClick={() => setShowEventForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-button">{editingEventId ? "Update event" : "Save event"}</button>
                </div>
              </form>
            )}

            {events.length === 0 ? (
              <div className="empty-state">
                <h3>No events added yet</h3>
                <p>Add your first event for this wedding.</p>
              </div>
            ) : (
              <div className="wedding-grid">
                {events.map((event) => (
                  <article className="wedding-card" key={event.id}>
                    <h3>{event.event_name}</h3>
                    {event.description && <p>{event.description}</p>}
                    {event.event_date && <p>{new Date(event.event_date).toLocaleString()}</p>}
                    {event.venue && <p><strong>Venue:</strong> {event.venue}</p>}
                    {event.address && <p>{event.address}</p>}
                  {event.map_url && <p><a href={event.map_url} target="_blank" rel="noreferrer">Open map</a></p>}
                  <button type="button" className="secondary-button" onClick={() => {
                    setEditingEventId(event.id);
                    setEventMusicFile(null);
                    setEventMusicPreview("");
                    setRemoveEventMusic(false);
                    setEventForm({ event_name: event.event_name, event_name_bn: event.event_name_bn || "", description: event.description || "", description_bn: event.description_bn || "", event_date: event.event_date ? event.event_date.slice(0, 16) : "", venue: event.venue || "", venue_bn: event.venue_bn || "", address: event.address || "", address_bn: event.address_bn || "", map_url: event.map_url || "", music_title: event.music_title || "", music_artist: event.music_artist || "", music_enabled: Boolean(event.music_enabled), music_url: event.music_url || "", sort_order: event.sort_order || 0 });
                    setShowEventForm(true);
                  }}>Edit event</button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => deleteEvent(event.id)}
                     
                    >
                      Delete event
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="wedding-list">
          <div className="section-heading">
            <h2>Your weddings</h2>
            <span>{weddings.length} total</span>
          </div>

          {weddings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✦</div>
              <h3>No weddings created yet</h3>
              <p>Start by creating your first wedding invitation.</p>
              <button
                className="secondary-button"
                onClick={() => setShowForm(true)}
               
              >
                Create your first wedding
              </button>
            </div>
          ) : (
            <div className="wedding-grid">
              {weddings.map((wedding) => (
                <article className="wedding-card" key={wedding.id}>
                  <div className="card-icon">✦</div>
                  <h3>{wedding.title}</h3>
                  <p>{wedding.groom_name || "Groom"} & {wedding.bride_name || "Bride"}</p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openEvents(wedding)}
                  >
                    Manage events →
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => loadGuests(wedding.id)}
                  >
                    Manage Guests →
                  </button>

                  <Link className="secondary-button editor-link" to={`/admin/weddings/${wedding.id}/edit`}>Edit invitation →</Link>
                  <a className="secondary-button editor-link" href={`/${wedding.slug}`} target="_blank" rel="noreferrer">View public invitation →</a>


                  <div className="card-footer">
                    <code>/{wedding.slug}</code>
                    <span className={wedding.is_active ? "status-active" : "status-inactive"}>
                      {wedding.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return <Routes>
    <Route path="/" element={<AdminDashboard />} />
    <Route path="/admin/weddings/:id/edit" element={<InvitationEditor />} />
    <Route path="/guest-invitation/:token" element={<GuestInvitation />} />
    <Route path="/:slug" element={<PublicInvitation />} />
  </Routes>;
}
