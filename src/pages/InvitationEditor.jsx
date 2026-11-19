import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import './InvitationEditor.css';

const API = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname) ? 'http://127.0.0.1:8000/api' : '/api';
const SECTIONS = [
  { title: 'Opening', fields: [['opening_kicker', 'Small invitation label'], ['opening_message', 'Opening invitation line'], ['opening_venue', 'Opening venue line']] },
  { title: 'Blessing and invitation', fields: [['bismillah', 'Arabic blessing', 'textarea'], ['blessing_translation', 'Blessing translation'], ['invitation_label', 'Invitation label'], ['invited_heading', 'Invitation heading'], ['invitation_message', 'Formal invitation message', 'textarea'], ['family_signature', 'Family names / signature', 'textarea']] },
  { title: 'Our families and the couple', fields: [['family_kicker', 'Family section label'], ['family_heading', 'Family section heading'], ['groom_label', 'Groom label'], ['bride_label', 'Bride label'], ['groom_father', "Groom's father"], ['groom_mother', "Groom's mother"], ['bride_father', "Bride's father"], ['bride_mother', "Bride's mother"]] },
  { title: 'Celebrations and venue', fields: [['celebrations_kicker', 'Celebrations label'], ['celebrations_heading', 'Celebrations heading'], ['celebrations_subtitle', 'Celebrations subtitle'], ['countdown_target', 'Countdown target', 'datetime'], ['countdown_kicker', 'Countdown label'], ['countdown_heading', 'Countdown heading'], ['countdown_event_label', 'Countdown event label'], ['venue_kicker', 'Venue label'], ['venue_heading', 'Venue heading'], ['closing_event_label', 'Closing event label']] },
  { title: 'Closing card', fields: [['closing_heading', 'Closing heading'], ['closing_message', 'Closing message', 'textarea']] },
  { title: 'RSVP and gallery', fields: [['rsvp_kicker', 'RSVP label'], ['rsvp_heading', 'RSVP heading'], ['rsvp_confirm_label', 'Confirm attendance button'], ['rsvp_decline_label', 'Decline attendance button'], ['rsvp_submit_label', 'Submit response button'], ['gallery_kicker', 'Gallery label']] },
];

export default function InvitationEditor() {
  const { id } = useParams();
  const token = localStorage.getItem('admin_token') || '';
  const config = useMemo(() => token ? { headers: { Authorization: `Bearer ${token}` } } : {}, [token]);
  const [wedding, setWedding] = useState(null);
  const [title, setTitle] = useState('');
  const [bride, setBride] = useState('');
  const [groom, setGroom] = useState('');
  const [content, setContent] = useState({});
  const [theme, setTheme] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    axios.get(`${API}/admin/weddings/${id}`, config).then(({ data }) => {
      if (!active) return;
      const value = data.wedding || data;
      setWedding(value); setTitle(value.title || ''); setBride(value.bride_name || ''); setGroom(value.groom_name || '');
      const mediaContent = { ...(value.content || {}) };
      for (const field of ['bride_photo', 'groom_photo', 'music']) if (mediaContent[field] && !mediaContent[field].startsWith('/wedding-media/') && !mediaContent[field].startsWith('http')) mediaContent[field] = `/wedding-media/${mediaContent[field]}`;
      mediaContent.gallery = (mediaContent.gallery || []).map(item => ({ ...item, url: item.url || (item.path?.startsWith('/wedding-media/') ? item.path : `/wedding-media/${item.path || ''}`) }));
      setContent(mediaContent);
      const design = { ...(value.design_settings || {}) };
      if (typeof design.primary_color === 'string' && ['#315d46', '#345b43'].includes(design.primary_color.toLowerCase())) design.primary_color = '#642a35';
      if (typeof design.accent_color === 'string' && design.accent_color.toLowerCase() === '#c99d5e') design.accent_color = '#b38a4d';
      if (!['Bodoni Moda', 'Cormorant Garamond'].includes(design.font_family)) design.font_family = 'Cormorant Garamond';
      setTheme(design);
    }).catch(() => active && setMessage('Could not load this wedding. Check that Laravel is running.'));
    return () => { active = false; };
  }, [config, id]);

  function setContentField(key, lang, value) {
    setContent(current => ({ ...current, [`${key}_${lang}`]: value }));
  }

  async function save(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      const storedContent = { ...content };
      for (const field of ['bride_photo', 'groom_photo', 'music']) if (storedContent[field]?.startsWith('/wedding-media/')) storedContent[field] = storedContent[field].slice('/wedding-media/'.length);
      storedContent.gallery = (storedContent.gallery || []).map(item => ({ ...item, path: item.path || (item.url || '').replace(/^\/wedding-media\//, '') })).filter(item => item.path);
      const { data } = await axios.put(`${API}/admin/weddings/${id}`, { title, bride_name: bride, groom_name: groom, content: storedContent, design_settings: theme, is_active: wedding.is_active }, config);
      setWedding(data.wedding); setMessage('Invitation content saved to the database.');
    } catch (err) { setMessage(err.response?.data?.message || 'Could not save invitation content.'); }
    finally { setBusy(false); }
  }

  async function upload(kind, file, caption = '') {
    if (!file) return;
    const form = new FormData(); form.append('kind', kind); form.append('file', file); if (caption) form.append('caption', caption);
    setBusy(true); setMessage('');
    try { const { data } = await axios.post(`${API}/admin/weddings/${id}/media`, form, config); setContent(current => ({ ...current, ...data.content })); setMessage('Media uploaded and saved.'); }
    catch (err) { setMessage(err.response?.data?.message || Object.values(err.response?.data?.errors || {}).flat().join(' ') || 'Upload failed.'); }
    finally { setBusy(false); }
  }

  async function removeMedia(kind, url) {
    const path = url?.replace(/^\/wedding-media\//, '');
    if (!path) return;
    try {
      const { data } = await axios.delete(`${API}/admin/weddings/${id}/media`, { ...config, data: { kind, path } });
      setContent(current => ({ ...current, ...data.content })); setMessage('Media removed.');
    } catch (err) { setMessage(err.response?.data?.message || 'Could not remove media.'); }
  }

  if (!wedding) return <main className="editor-shell"><p>{message || 'Loading invitation editor…'}</p><Link to="/">Back to dashboard</Link></main>;
  return <main className="editor-shell">
    <header className="editor-header"><div><Link to="/">← Dashboard</Link><p className="eyebrow">INVITATION CONTENT</p><h1>{wedding.title}</h1></div><div className="editor-actions"><a href={`/${wedding.slug}`} target="_blank" rel="noreferrer">Open invitation</a><span className={wedding.is_active ? 'status-active' : 'status-inactive'}>{wedding.is_active ? 'Active' : 'Inactive'}</span></div></header>
    {message && <p className="editor-message" role="status">{message}</p>}
    <form onSubmit={save} className="editor-form">
      <section className="editor-panel"><h2>Wedding details</h2><div className="editor-grid">
        <label>Invitation title<input value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label>Groom's name — English<input value={groom} onChange={e => setGroom(e.target.value)} /></label>
        <label>Groom's name — বাংলা<input lang="bn" value={content.groom_name_bn || ''} onChange={e => setContent({ ...content, groom_name_bn: e.target.value })} /></label>
        <label>Bride's name — English<input value={bride} onChange={e => setBride(e.target.value)} /></label>
        <label>Bride's name — বাংলা<input lang="bn" value={content.bride_name_bn || ''} onChange={e => setContent({ ...content, bride_name_bn: e.target.value })} /></label>
        <label>Invitation URL slug<input value={wedding.slug} readOnly /></label>
      </div></section>

      {SECTIONS.map(section => <section className="editor-panel" key={section.title}><h2>{section.title}</h2><div className="editor-grid bilingual-grid">
        {section.fields.map(([key, label, type]) => <div className={`bilingual-field ${type === 'textarea' ? 'wide' : ''}`} key={key}><span>{label}</span><label>English{renderField(key, 'en', type)}</label><label lang="bn">বাংলা{renderField(key, 'bn', type)}</label></div>)}
      </div></section>)}

      <section className="editor-panel"><h2>Theme and activation</h2><div className="editor-grid"><label>Primary wine color<input type="color" value={theme.primary_color || '#642a35'} onChange={e => setTheme({ ...theme, primary_color: e.target.value })} /></label><label>Antique gold accent<input type="color" value={theme.accent_color || '#b38a4d'} onChange={e => setTheme({ ...theme, accent_color: e.target.value })} /></label><label>Serif typeface<select value={theme.font_family || 'Cormorant Garamond'} onChange={e => setTheme({ ...theme, font_family: e.target.value })}><option>Cormorant Garamond</option><option>Bodoni Moda</option></select></label><label className="toggle-field">Invitation active<input type="checkbox" checked={Boolean(wedding.is_active)} onChange={e => setWedding({ ...wedding, is_active: e.target.checked })} /></label></div></section>

      <section className="editor-panel"><h2>Photographs, gallery and invitation music</h2><div className="editor-media-grid">
        <MediaField title="Groom photograph" current={content.groom_photo} accept="image/jpeg,image/png,image/webp" onUpload={file => upload('groom_photo', file)} onRemove={() => removeMedia('groom_photo', content.groom_photo)} />
        <MediaField title="Bride photograph" current={content.bride_photo} accept="image/jpeg,image/png,image/webp" onUpload={file => upload('bride_photo', file)} onRemove={() => removeMedia('bride_photo', content.bride_photo)} />
        <MediaField title="Invitation-wide music" current={content.music} accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/aac" onUpload={file => upload('music', file)} onRemove={() => removeMedia('music', content.music)} />
        <MediaField title="Add gallery photograph" accept="image/jpeg,image/png,image/webp" onUpload={file => upload('gallery', file, window.prompt('Optional caption / ছবির বিবরণ') || '')} />
      </div><div className="editor-gallery">{(content.gallery || []).map((image, i) => <figure key={image.url || i}><img src={image.url} alt={image.caption || ''}/><figcaption>{image.caption || `Gallery image ${i + 1}`}</figcaption><button type="button" onClick={() => removeMedia('gallery', image.url)}>Remove</button></figure>)}</div><p className="editor-hint">Images: JPEG, PNG or WebP up to 8 MB. Audio: supported audio files up to 20 MB.</p></section>
      <div className="editor-save-row"><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save invitation content'}</button></div>
    </form>
  </main>;

  function renderField(key, lang, type) {
    const name = `${key}_${lang}`;
    const value = content[name] || (lang === 'en' ? content[key] || '' : '');
    if (type === 'textarea') return <textarea rows="3" value={value} onChange={e => setContentField(key, lang, e.target.value)} />;
    if (type === 'datetime') return lang === 'en' ? <input type="datetime-local" value={(content.countdown_target || '').slice(0, 16)} onChange={e => setContent({ ...content, countdown_target: e.target.value })} /> : <input disabled aria-label="The date and time use one shared instant for both languages." />;
    return <input lang={lang === 'bn' ? 'bn' : 'en'} value={value} onChange={e => setContentField(key, lang, e.target.value)} />;
  }
}

function MediaField({ title, current, accept, onUpload, onRemove }) {
  return <label className="media-field">{title}{current && (accept.startsWith('image') ? <img src={current} alt="Current upload"/> : <audio src={current} controls />)}{current && <button type="button" onClick={onRemove}>Remove current</button>}<input type="file" accept={accept} onChange={e => { onUpload(e.target.files?.[0]); e.target.value = ''; }} /></label>;
}
