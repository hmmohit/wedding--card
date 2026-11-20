import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './InvitationPages.css';

const API = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname) ? 'http://127.0.0.1:8000/api' : '/api';

const WORDS = {
  en: {
    invite: 'Request the joy of your company at their wedding', byGrace: 'By the grace of Almighty Allah',
    heartfelt: 'A heartfelt invitation', invited: "You're invited", families: 'Our families', familyTitle: 'Two homes, one celebration',
    groom: 'The groom', bride: 'The bride', son: 'Son of', daughter: 'Daughter of', celebrations: 'The celebrations',
    daysJoy: 'Three days of joy', map: 'Open in maps', calendar: 'Add to calendar', countdown: 'The countdown',
    counting: 'Counting the days', venue: 'The venue', reception: 'The wedding evening', closing: 'We would love to see you there',
    presence: 'Your presence will make our celebration complete.', withLove: 'With love,', rsvp: 'Kindly reply',
    attending: 'We will attend', declining: 'We are unable to attend', guests: 'Number attending', message: 'A message for the families (optional)',
    send: 'Send response', submitted: 'Your response has been saved. Thank you.', days: 'Days', hours: 'Hours', minutes: 'Minutes', seconds: 'Seconds',
    music: 'Invitation music', play: 'Play', pause: 'Pause', eventMusic: 'Event music',
  },
  bn: {
    invite: 'তাঁদের বিবাহে আপনাদের সানন্দ উপস্থিতি কামনা করছি', byGrace: 'মহান আল্লাহর অশেষ রহমতে',
    heartfelt: 'সাদর আমন্ত্রণ', invited: 'আপনাকে আমন্ত্রণ', families: 'আমাদের পরিবার', familyTitle: 'দুই পরিবার, এক আনন্দোৎসব',
    groom: 'বর', bride: 'কনে', son: 'সন্তান', daughter: 'কন্যা', celebrations: 'অনুষ্ঠানসমূহ',
    daysJoy: 'তিন দিনের আনন্দ', map: 'মানচিত্রে দেখুন', calendar: 'ক্যালেন্ডারে যোগ করুন', countdown: 'শুভক্ষণ আসন্ন',
    counting: 'দিন গুনছি', venue: 'অনুষ্ঠানস্থল', reception: 'বিবাহের সন্ধ্যা', closing: 'আপনাদের অপেক্ষায় থাকব',
    presence: 'আপনাদের উপস্থিতি আমাদের আনন্দকে পূর্ণতা দেবে।', withLove: 'শুভেচ্ছান্তে,', rsvp: 'উপস্থিতি নিশ্চিত করুন',
    attending: 'আমরা উপস্থিত থাকব', declining: 'আমরা উপস্থিত থাকতে পারব না', guests: 'উপস্থিতির সংখ্যা', message: 'পরিবারের জন্য বার্তা (ঐচ্ছিক)',
    send: 'উত্তর পাঠান', submitted: 'আপনার উত্তর সংরক্ষণ করা হয়েছে। ধন্যবাদ।', days: 'দিন', hours: 'ঘণ্টা', minutes: 'মিনিট', seconds: 'সেকেন্ড',
    music: 'আমন্ত্রণের সুর', play: 'চালান', pause: 'থামান', eventMusic: 'অনুষ্ঠানের সুর',
  },
};

const bnDigits = value => String(value).replace(/[0-9]/g, digit => '০১২৩৪৫৬৭৮৯'[digit]);
const formatDate = (value, lang, options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', options).format(date);
};
const formatTime = (value, lang) => formatDate(value, lang, { hour: 'numeric', minute: '2-digit' });
const calendarUrl = (event, lang) => {
  if (!event.event_date) return '';
  const start = new Date(event.event_date);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const compact = date => date.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const details = [eventTextLocalized(event, 'description', lang), eventTextLocalized(event, 'address', lang)].filter(Boolean).join('\n');
  const params = new URLSearchParams({ action: 'TEMPLATE', text: eventTextLocalized(event, 'event_name', lang) || '', dates: `${compact(start)}/${compact(end)}`, details, location: [eventTextLocalized(event, 'venue', lang), eventTextLocalized(event, 'address', lang)].filter(Boolean).join(', ') });
  return `https://calendar.google.com/calendar/render?${params}`;
};
const eventTextLocalized = (event, key, lang) => lang === 'bn' ? (event[`${key}_bn`] || event[key] || '') : (event[key] || event[`${key}_bn`] || '');

export function WeddingInvitation({ guestMode = false }) {
  const { slug, token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState(() => localStorage.getItem('invitation_language') === 'bn' ? 'bn' : 'en');
  const [backgroundPlaying, setBackgroundPlaying] = useState(false);
  const [rsvpForm, setRsvpForm] = useState({ status: 'confirmed', attending_count: 1, message: '' });
  const [rsvpMessage, setRsvpMessage] = useState('');
  const [rsvpSaved, setRsvpSaved] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [playingEventIndex, setPlayingEventIndex] = useState(null);
  const [audioErrorIndex, setAudioErrorIndex] = useState(null);
  const [finalVisible, setFinalVisible] = useState(false);
  const audioRefs = useRef({});
  const playRequestRef = useRef(0);
  const finalRef = useRef(null);
  const key = guestMode ? token : slug;
  const words = WORDS[language];

  useEffect(() => {
    let alive = true;
    axios.get(`${API}/${guestMode ? 'guest-invitation' : 'invitation'}/${key}`)
      .then(({ data: result }) => {
        if (!alive) return;
        setData(result);
        if (result.rsvp) setRsvpForm({ ...result.rsvp });
      })
      .catch(() => alive && setError('This invitation is unavailable. It may be inactive or the link may be incorrect.'));
    return () => { alive = false; };
  }, [guestMode, key]);

  const wedding = data?.wedding;
  const content = wedding?.content || {};
  const events = data?.events || [];
  const mainEvent = events.find(event => /wedding|biye|biyey|nikah|বিয়ে|বিয়ে|বিবাহ|নিকাহ/i.test(`${event.event_name || ''} ${event.event_name_bn || ''}`)) || events[0];
  const target = content.countdown_target || mainEvent?.event_date || events.find(event => event.event_date)?.event_date;
  const theme = useMemo(() => wedding?.design_settings || {}, [wedding]);
  const cssVars = useMemo(() => {
    const primary = typeof theme.primary_color === 'string' ? theme.primary_color.toLowerCase() : '';
    const accent = typeof theme.accent_color === 'string' ? theme.accent_color.toLowerCase() : '';
    return {
      '--wine': primary && !['#315d46', '#345b43'].includes(primary) ? theme.primary_color : '#642a35',
      '--gold': accent && accent !== '#c99d5e' ? theme.accent_color : '#b38a4d',
      '--editorial-font': `'${theme.font_family || 'Cormorant Garamond'}'`,
    };
  }, [theme]);
  const field = (key, fallback = '') => {
    const en = content[`${key}_en`] ?? content[key] ?? fallback;
    const bn = content[`${key}_bn`] ?? en;
    return language === 'bn' ? (bn || en || fallback) : (en || bn || fallback);
  };
  const personName = (person, key) => language === 'bn' ? (content[`${key}_bn`] || person || '') : (person || content[`${key}_bn`] || '');
  const eventName = event => language === 'bn' ? (event.event_name_bn || event.event_name || '') : (event.event_name || event.event_name_bn || '');
  const eventText = (event, key) => language === 'bn' ? (event[`${key}_bn`] || event[key] || '') : (event[key] || event[`${key}_bn`] || '');

  useEffect(() => {
    if (!target) return undefined;
    const update = () => {
      const diff = Math.max(0, new Date(target).getTime() - Date.now());
      setTimeLeft({ days: Math.floor(diff / 86400000), hours: Math.floor(diff / 3600000) % 24, minutes: Math.floor(diff / 60000) % 60, seconds: Math.floor(diff / 1000) % 60 });
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [target]);

  useEffect(() => {
    if (!data || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame = null;
    let direction = 1;
    let lastTime = 0;
    let pauseUntil = 0;
    let stopped = false;
    let musicStarted = false;
    const speed = 0.025;

    const stopForUser = event => {
      if (stopped) return;
      stopped = true;
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('wheel', stopForUser);
      window.removeEventListener('touchstart', stopForUser);
      window.removeEventListener('pointerdown', stopForUser);
      window.removeEventListener('keydown', stopForUser);
      const clickedMusicControl = event?.target?.closest?.('.background-music-button');
      if (!clickedMusicControl && content.music && !musicStarted) {
        const player = document.getElementById('invite-audio');
        if (player) player.play().then(() => setBackgroundPlaying(true)).catch(() => {});
      }
    };

    const animate = timestamp => {
      if (stopped) return;
      if (!lastTime) lastTime = timestamp;
      const elapsed = Math.min(timestamp - lastTime, 50);
      lastTime = timestamp;
      if (timestamp >= pauseUntil) {
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        if (maxScroll > 0) {
          window.scrollBy(0, direction * elapsed * speed);
          if (direction > 0 && window.scrollY >= maxScroll - 2) {
            direction = -1;
            pauseUntil = timestamp + 1600;
          } else if (direction < 0 && window.scrollY <= 1) {
            direction = 1;
            pauseUntil = timestamp + 1600;
          }
        }
      }
      frame = window.requestAnimationFrame(animate);
    };

    const startTimer = window.setTimeout(() => {
      if (content.music) {
        const player = document.getElementById('invite-audio');
        if (player) player.play().then(() => {
          musicStarted = true;
          setBackgroundPlaying(true);
        }).catch(() => {});
      }
      frame = window.requestAnimationFrame(animate);
    }, 900);

    window.addEventListener('wheel', stopForUser, { passive: true });
    window.addEventListener('touchstart', stopForUser, { passive: true });
    window.addEventListener('pointerdown', stopForUser, { passive: true });
    window.addEventListener('keydown', stopForUser);
    return () => {
      stopped = true;
      window.clearTimeout(startTimer);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('wheel', stopForUser);
      window.removeEventListener('touchstart', stopForUser);
      window.removeEventListener('pointerdown', stopForUser);
      window.removeEventListener('keydown', stopForUser);
    };
  }, [data, content.music]);

  useEffect(() => {
    const node = finalRef.current;
    if (!node || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setFinalVisible(true); observer.disconnect(); }
    }, { threshold: 0.25 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [data]);

  function changeLanguage(next) {
    setLanguage(next);
    localStorage.setItem('invitation_language', next);
  }

  async function toggleBackgroundMusic() {
    const player = document.getElementById('invite-audio');
    if (!player) return;
    if (backgroundPlaying) { player.pause(); setBackgroundPlaying(false); return; }
    ++playRequestRef.current;
    Object.values(audioRefs.current).forEach(audio => audio?.pause());
    setPlayingEventIndex(null);
    try { await player.play(); setBackgroundPlaying(true); } catch { setBackgroundPlaying(false); }
  }

  async function submitRsvp(e) {
    e.preventDefault();
    setRsvpSaved(false);
    try {
      const response = await axios.post(`${API}/guest-invitation/${token}/rsvp`, { ...rsvpForm, attending_count: Number(rsvpForm.attending_count) });
      setRsvpForm(response.data.rsvp);
      setRsvpMessage('');
      setRsvpSaved(true);
    } catch (err) {
      const message = err.response?.data?.message || Object.values(err.response?.data?.errors || {}).flat().join(' ');
      setRsvpMessage(message || 'Unable to save RSVP.');
    }
  }

  async function toggleEventMusic(index) {
    const request = ++playRequestRef.current;
    const current = audioRefs.current[index];
    if (!current) return;
    if (playingEventIndex === index && !current.paused) {
      Object.values(audioRefs.current).forEach(audio => audio?.pause());
      setPlayingEventIndex(null);
      return;
    }
    document.getElementById('invite-audio')?.pause();
    setBackgroundPlaying(false);
    Object.values(audioRefs.current).forEach(audio => audio?.pause());
    setAudioErrorIndex(null);
    try {
      await current.play();
      if (request === playRequestRef.current) setPlayingEventIndex(index);
      else current.pause();
    } catch {
      setPlayingEventIndex(null);
      setAudioErrorIndex(index);
    }
  }

  if (error) return <main className="invite-error">{error}</main>;
  if (!data) return <main className="invite-loading" aria-live="polite">{language === 'bn' ? 'আমন্ত্রণ প্রস্তুত হচ্ছে…' : 'Preparing your invitation…'}</main>;

  const groom = personName(wedding.groom_name, 'groom_name');
  const bride = personName(wedding.bride_name, 'bride_name');
  const firstVenue = mainEvent?.venue || mainEvent?.venue_bn ? mainEvent : events.find(event => event.venue || event.venue_bn);
  const firstAddress = mainEvent?.address || mainEvent?.address_bn ? mainEvent : events.find(event => event.address || event.address_bn);
  const mapEvent = mainEvent?.map_url ? mainEvent : events.find(event => event.map_url);
  const closingEvent = mainEvent?.event_date ? mainEvent : events.find(event => event.event_date);
  const targetDate = target ? new Date(target) : null;
  const eventIllustration = name => {
    const value = name.toLowerCase();
    if (/holud|haldi|হলুদ/.test(value)) return 'holud';
    if (/walima|bou.?bhat|reception|বৌভাত/.test(value)) return 'feast';
    if (/mehendi|মেহেদি/.test(value)) return 'mehendi';
    if (/nikah|biye|wedding|বিয়ে|বিয়ে|বিবাহ|নিকাহ/.test(value)) return 'wedding';
    return 'celebration';
  };

  return <main className={`invitation editorial-invitation ${language === 'bn' ? 'is-bengali' : ''}`} style={cssVars} lang={language === 'bn' ? 'bn' : 'en'}>
    <div className="language-switch" role="group" aria-label="Choose invitation language">
      <button type="button" className={language === 'en' ? 'selected' : ''} onClick={() => changeLanguage('en')}>EN</button>
      <button type="button" className={language === 'bn' ? 'selected' : ''} onClick={() => changeLanguage('bn')}>বাংলা</button>
    </div>
    <section className="editorial-opening">
      <div className="opening-paper">
        <p className="editorial-small-label">{field('opening_kicker', words.invite)}</p>
        <h1 className="script-name">{groom}<span>&amp;</span>{bride}</h1>
        <p className="opening-invite-line">{field('opening_message', words.invite)}</p>
        <p className="opening-date">{target ? formatDate(target, language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}</p>
        <p className="opening-place">{field('opening_venue', firstVenue ? eventText(firstVenue, 'venue') : '')}</p>
        <a className="scroll-prompt" href="#blessing">{language === 'bn' ? 'নিচে দেখুন' : 'Scroll'} <span>↓</span></a>
      </div>
      <div className="curtain curtain-left" aria-hidden="true"/><div className="curtain curtain-right" aria-hidden="true"/>
      <div className="curtain-valance" aria-hidden="true"/>
      {content.music && <button className="background-music-button" type="button" onClick={toggleBackgroundMusic} aria-label={backgroundPlaying ? words.pause : words.play} aria-pressed={backgroundPlaying}><span>{backgroundPlaying ? 'Ⅱ' : '♫'}</span><audio id="invite-audio" src={content.music} loop preload="none"/><span className="speaker-label">{words.music}</span></button>}
    </section>

    <section id="blessing" className="blessing-section editorial-section">
      <OrnateCard className="blessing-card"><span className="bow-ornament" aria-hidden="true">⌁</span><p className="arabic-blessing" dir="rtl">{field('bismillah', 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ')}</p><p className="blessing-translation">{field('blessing_translation', words.byGrace)}</p><Flourish/><p className="editorial-small-label">{field('invitation_label', words.heartfelt)}</p><h2 className="script-heading">{field('invited_heading', words.invited)}</h2><p className="framed-message">{field('invitation_message', '')}</p><p className="family-signature">{field('family_signature', '')}</p></OrnateCard>
    </section>

    <section className="family-section editorial-section">
      <div className="family-copy"><p className="editorial-small-label">{field('family_kicker', words.families)}</p><h2 className="script-heading">{field('family_heading', words.familyTitle)}</h2><FamilyIllustration/></div>
    </section>

    <section className="couple-introduction editorial-section">
      <div className="person-intro">{content.groom_photo && <img className="person-portrait" src={content.groom_photo} alt=""/>}<p className="editorial-small-label">{field('groom_label', words.groom)}</p><h2 className="script-heading">{groom}</h2><p>{words.son} {[field('groom_father', ''), field('groom_mother', '')].filter(Boolean).join(language === 'bn' ? ' ও ' : ' & ')}</p></div>
      <span className="tiny-flourish" aria-hidden="true">&amp;</span>
      <div className="person-intro">{content.bride_photo && <img className="person-portrait" src={content.bride_photo} alt=""/>}<p className="editorial-small-label">{field('bride_label', words.bride)}</p><h2 className="script-heading">{bride}</h2><p>{words.daughter} {[field('bride_father', ''), field('bride_mother', '')].filter(Boolean).join(language === 'bn' ? ' ও ' : ' & ')}</p></div>
    </section>

    <section className="celebrations-section editorial-section">
      <p className="editorial-small-label">{field('celebrations_kicker', words.celebrations)}</p><h2 className="script-heading">{field('celebrations_heading', words.celebrations)}</h2><p className="section-subtitle">{field('celebrations_subtitle', words.daysJoy)}</p>
      <div className="celebration-grid">{events.map((event, i) => <article className="celebration-card" key={`${event.event_name}-${i}`}><EventIllustration type={eventIllustration(eventName(event))}/><span className="roman-index">{['I', 'II', 'III', 'IV', 'V'][i] || String(i + 1)}</span><h3 className="script-heading">{eventName(event)}</h3><p>{eventText(event, 'description')}</p><p className="editorial-small-label">{event.event_date ? formatDate(event.event_date, language, { weekday: 'long' }) : ''}</p><strong>{event.event_date ? formatDate(event.event_date, language, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</strong><b className="event-time">{event.event_date ? formatTime(event.event_date, language) : ''}</b><p className="celebration-venue">{eventText(event, 'venue')}</p><p className="event-address">{eventText(event, 'address')}</p><EventMusicControl event={event} index={i} words={words} language={language} playingEventIndex={playingEventIndex} audioErrorIndex={audioErrorIndex} setAudioRef={(index, audio) => { audioRefs.current[index] = audio; }} onToggle={toggleEventMusic} onEnded={() => setPlayingEventIndex(current => current === i ? null : current)}/>{event.map_url && <a className="outline-action" href={event.map_url} target="_blank" rel="noreferrer">⌖ &nbsp;{words.map}</a>}{event.event_date && <a className="outline-action" href={calendarUrl(event, language)} target="_blank" rel="noreferrer">▣ &nbsp;{words.calendar}</a>}</article>)}</div>
    </section>

    {timeLeft && targetDate && <section className="countdown-section editorial-section"><p className="editorial-small-label">{field('countdown_kicker', words.countdown)}</p><h2 className="script-heading">{field('countdown_heading', words.counting)}</h2><div className="date-medallions">{[
      formatDate(targetDate, language, { day: 'numeric' }), formatDate(targetDate, language, { month: 'short' }), formatDate(targetDate, language, { year: 'numeric' }),
    ].map((part, i) => <span className="date-medallion" key={i}>{part}</span>)}</div><div className="countdown-clock">{Object.entries(timeLeft).map(([key, value]) => <div key={key}><strong>{language === 'bn' ? bnDigits(String(value).padStart(2, '0')) : String(value).padStart(2, '0')}</strong><span>{words[key]}</span></div>)}</div><p className="countdown-event-name">{field('countdown_event_label', language === 'bn' ? 'শুভ বিবাহ' : 'The wedding')}<br/>{formatDate(targetDate, language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {formatTime(targetDate, language)}</p></section>}

    <section className="venue-section editorial-section"><div className="venue-illustration"><VenueIllustration/></div><p className="editorial-small-label">{field('venue_kicker', words.venue)}</p><h2>{field('venue_heading', firstVenue ? eventText(firstVenue, 'venue') : '')}</h2><p className="venue-address">{firstAddress ? eventText(firstAddress, 'address') : ''}</p><span className="editorial-small-label">{field('closing_event_label', words.reception)}</span>{closingEvent && <p>{formatDate(closingEvent.event_date, language)} · {formatTime(closingEvent.event_date, language)}</p>}{mapEvent && <a className="outline-action" href={mapEvent.map_url} target="_blank" rel="noreferrer">⌖ &nbsp;{words.map}</a>}<CoupleIllustration/></section>

    {content.gallery?.length > 0 && <section className="editorial-section editorial-gallery"><p className="editorial-small-label">{field('gallery_kicker', language === 'bn' ? 'স্মৃতির অ্যালবাম' : 'A few lovely moments')}</p><div className="editorial-gallery-grid">{content.gallery.map((image, i) => <figure key={image.url || i}><img src={image.url} alt={image.caption || ''}/>{image.caption && <figcaption>{image.caption}</figcaption>}</figure>)}</div></section>}

    {guestMode && <section className="editorial-rsvp editorial-section"><p className="editorial-small-label">{field('rsvp_kicker', words.rsvp)}</p><h2 className="script-heading">{field('rsvp_heading', words.rsvp)}{data.guest?.name ? `, ${data.guest.name}` : ''}</h2><form onSubmit={submitRsvp}><label>{language === 'bn' ? 'আপনার উত্তর' : 'Your response'}<select value={rsvpForm.status} onChange={e => setRsvpForm({ ...rsvpForm, status: e.target.value })}><option value="confirmed">{field('rsvp_confirm_label', words.attending)}</option><option value="declined">{field('rsvp_decline_label', words.declining)}</option></select></label>{rsvpForm.status === 'confirmed' && <label>{words.guests}<input type="number" min="1" max={data.guest.allowed_guests} value={rsvpForm.attending_count || 1} onChange={e => setRsvpForm({ ...rsvpForm, attending_count: Number(e.target.value) })}/><small>{language === 'bn' ? 'সর্বোচ্চ' : 'Up to'} {language === 'bn' ? bnDigits(data.guest.allowed_guests) : data.guest.allowed_guests}</small></label>}<label>{words.message}<textarea maxLength="2000" value={rsvpForm.message || ''} onChange={e => setRsvpForm({ ...rsvpForm, message: e.target.value })}/></label><button className="rsvp-submit" type="submit">{field('rsvp_submit_label', words.send)}</button>{(rsvpSaved || rsvpMessage) && <p className="rsvp-feedback" role="status">{rsvpSaved ? words.submitted : rsvpMessage}</p>}</form></section>}

    <footer ref={finalRef} className={`editorial-final ${finalVisible ? 'final-visible' : ''}`}><div className="final-curtain final-curtain-left"/><div className="final-curtain final-curtain-right"/><OrnateCard className="final-invitation-card"><p className="script-heading">{field('closing_heading', words.closing)}</p><p>{field('closing_message', words.presence)}</p><p className="script-signoff">{groom} &amp; {bride}</p><Flourish/><p className="final-date">{target ? formatDate(target, language, { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}{firstVenue ? ` · ${eventText(firstVenue, 'venue')}` : ''}</p><p>{words.withLove}<br/>{field('family_signature', '')}</p></OrnateCard><div className="final-scallop"/></footer>
  </main>;
}

function EventMusicControl({ event, index, words, language, playingEventIndex, audioErrorIndex, setAudioRef, onToggle, onEnded }) {
  if (!event.music_enabled || !event.music_url) return null;
  return <div className="event-music-control"><audio className="event-music-audio" ref={audio => setAudioRef(index, audio)} src={event.music_url} preload="none" onEnded={onEnded}/><button className="event-music-button" type="button" onClick={() => onToggle(index)} aria-label={`${playingEventIndex === index ? words.pause : words.play} ${event.music_title || (language === 'bn' ? event.event_name_bn || event.event_name : event.event_name)}`} aria-pressed={playingEventIndex === index}>{playingEventIndex === index ? 'Ⅱ' : '▶'}</button><span><strong>{event.music_title || words.eventMusic}</strong>{event.music_artist && <small>{event.music_artist}</small>}</span>{audioErrorIndex === index && <small className="audio-error">{language === 'bn' ? 'আবার চালু করতে স্পর্শ করুন।' : 'Tap to try playback again.'}</small>}</div>;
}

function OrnateCard({ children, className = '' }) { return <div className={`ornate-card ${className}`}><div className="ornate-corner top-left"/><div className="ornate-corner top-right"/><div className="ornate-corner bottom-left"/><div className="ornate-corner bottom-right"/>{children}</div>; }
function Flourish() { return <div className="editorial-flourish" aria-hidden="true"><span/><b>❧</b><span/></div>; }
function FamilyIllustration() {
  return <svg className="family-illustration" viewBox="0 0 620 250" role="img" aria-label="Illustration of two families celebrating together">
    <defs><linearGradient id="family-wash" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ead7c8" stopOpacity=".15"/><stop offset="1" stopColor="#c89c8d" stopOpacity=".28"/></linearGradient></defs>
    <path d="M38 214H582" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M70 213V105l48-38 48 38v108M82 213v-72h72v72M96 141v25m44-25v25M101 183h36M80 105h76M98 89l20-35 20 35" fill="url(#family-wash)" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M454 213V105l48-38 48 38v108M466 213v-72h72v72M480 141v25m44-25v25M485 183h36M464 105h76M482 89l20-35 20 35" fill="url(#family-wash)" stroke="currentColor" strokeWidth="1.4"/>
    <g stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" fill="url(#family-wash)">
      <circle cx="215" cy="77" r="20"/><path d="M188 105q27-22 54 0l13 76h-80z"/><path d="M193 112q22 17 44 0M202 181l-8 32m39-32 8 32"/>
      <path d="M188 61q27-38 54 0M195 57q20-23 40 0"/>
      <circle cx="300" cy="58" r="23"/><path d="M266 91q34-27 68 0l17 122h-102z"/><path d="M269 105q31 22 62 0M281 210l-7 3m47-3 7 3"/><path d="M278 38q22-35 45 0M277 42q23 15 46 0"/>
      <circle cx="390" cy="77" r="20"/><path d="M363 105q27-22 54 0l13 76h-80z"/><path d="M368 112q22 17 44 0M377 181l-8 32m39-32 8 32"/><path d="M363 61q27-38 54 0M370 57q20-23 40 0"/>
      <path d="M215 105v72m85-86v111m90-97v72" fill="none"/>
      <path d="M180 128l-17 42m91-42 17 42m-1-75-17 31m85-31 17 31m-1 44 17-44m-91 44-17-44" fill="none"/>
    </g>
    <g fill="none" stroke="#b58a68" strokeWidth="1.2"><path d="M260 214q40-32 80 0M280 214q20-52 40 0M300 162v52"/><path d="M30 214q20-26 40 0m480 0q20-26 40 0"/></g>
    <g fill="#b58a68"><circle cx="300" cy="19" r="3"/><circle cx="284" cy="25" r="2"/><circle cx="316" cy="25" r="2"/></g>
  </svg>;
}
function EventIllustration({ type }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.55, strokeLinecap: "round", strokeLinejoin: "round" };
  return <svg className={`event-illustration illustration-${type}`} viewBox="0 0 240 150" aria-hidden="true" {...common}>
    <path d="M12 132H228" opacity=".55"/>
    {type === 'holud' ? <>
      <path d="M72 128q5-33 23-44 15-8 31 0 18 11 22 44M89 83q-2-20 13-29 18-7 31 8l-3 23M91 91q26 15 48 0M102 102v26m28-26v26"/>
      <path d="M94 56q-8-26 13-35 23-9 37 15l-8 19M100 48q15-19 37-5" />
      <path d="M48 126q-3-24 17-35 17-8 30 4M159 125q7-27 28-32 18-4 28 10"/>
      <path d="M31 45q14-22 28 0-14 21-28 0Zm144-15q13-19 26 0-13 19-26 0ZM50 22q10-16 20 0-10 16-20 0Z"/>
      <path d="M35 64q25-15 48 0m78-19q18-13 37 0"/>
      <circle cx="120" cy="12" r="4"/><path d="M120 16v18m-7-9h14"/>
    </> : type === 'feast' ? <>
      <path d="M31 73q89-42 178 0l-13 18H44zM48 91v35m144-35v35M39 127h26m111 0h26"/>
      <path d="M69 69q-2-23 15-30 17 7 15 30m43 0q-2-23 15-30 17 7 15 30"/>
      <path d="M77 40q7-17 14-3 9-14 14 3M151 40q7-17 14-3 9-14 14 3"/>
      <ellipse cx="120" cy="67" rx="27" ry="9"/><path d="M102 67q0-18 18-18t18 18m-18-18v18"/>
      <path d="M52 102q16-12 32 0m72 0q16-12 32 0M112 96v20m16-20v20"/>
      <path d="M22 53q-9-17 5-24 13 7 5 24m176 0q-9-17 5-24 13 7 5 24"/>
    </> : type === 'mehendi' ? <>
      <path d="M78 129q-4-37 17-52 25-18 50 0 21 15 17 52"/>
      <circle cx="120" cy="49" r="21"/><path d="M98 44q21-33 44 0M99 56q21 17 42 0"/>
      <path d="M86 85q34 18 68 0M96 92l-13 30m61-30 13 30"/>
      <path d="M35 126q13-40 34-41m102 0q22 3 34 41M47 55q12-22 24 0-12 22-24 0m98-31q12-22 24 0-12 22-24 0"/>
      <path d="M48 79q17 10 34 0m76 0q17 10 34 0"/>
    </> : type === 'wedding' ? <>
      <path d="M31 129V64l89-49 89 49v65M19 130h202M50 129V78h140v51"/>
      <path d="M69 78q51-47 102 0M84 78q36-30 72 0M111 130V91h18v39"/>
      <path d="M79 130q0-24 17-34 17 10 17 34m31 0q0-24 17-34 17 10 17 34"/>
      <circle cx="96" cy="82" r="9"/><circle cx="161" cy="82" r="9"/>
      <path d="M87 71q9-17 18 0m47 0q9-17 18 0M120 15V3m-7 9h14"/>
      <path d="M45 64q-10-16 0-24 10 8 0 24m150 0q-10-16 0-24 10 8 0 24"/>
    </> : <>
      <path d="M120 120 52 56q-27-29 2-44 32-16 66 23 34-39 66-23 29 15 2 44z"/>
      <path d="M120 35v85M54 57q26 8 66 63m66-63q-26 8-66 63"/>
      <path d="M38 126q82 22 164 0M58 137q62 11 124 0"/>
      <path d="M31 38q-8-16 4-25 13 9 4 25m166 0q-8-16 4-25 13 9 4 25"/>
    </>}
    <g fill="#b58a68" stroke="none"><circle cx="22" cy="18" r="2"/><circle cx="218" cy="18" r="2"/><circle cx="120" cy="143" r="2"/></g>
  </svg>;
}
function VenueIllustration() {
  return <svg className="venue-line-art" viewBox="0 0 620 230" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M34 194H586M72 193V95l42-34 42 34v98M82 193v-63h64v63M97 130v26m33-26v26M72 95h84M100 61l14-28 14 28"/>
    <path d="M190 193V74l120-56 120 56v119M210 193V91h200v102M190 74h240M228 91q82-83 164 0M257 91q53-54 106 0"/>
    <path d="M275 193v-70q0-38 35-38t35 38v70M286 123q24-23 48 0M310 85V53"/>
    <path d="M468 193V95l42-34 42 34v98M478 193v-63h64v63M493 130v26m33-26v26M468 95h84M496 61l14-28 14 28"/>
    <path d="M42 194q16-32 32 0m470 0q16-32 32 0M163 194q13-24 26 0m242 0q13-24 26 0"/>
    <path d="M40 214q28-15 56 0m428 0q28-15 56 0M100 224h420"/>
    <g fill="#b58a68" stroke="none"><circle cx="310" cy="13" r="3"/><circle cx="294" cy="19" r="2"/><circle cx="326" cy="19" r="2"/></g>
  </svg>;
}
function CoupleIllustration() {
  return (
    <div className="couple-illustration-frame">
      <img
        src="/images/invitation/couple.jpg"
        alt="Bride and groom wedding illustration"
        className="couple-illustration-image"
      />
    </div>
  );
}

export function GuestInvitation() { return <WeddingInvitation guestMode />; }
export function PublicInvitation() { return <WeddingInvitation />; }
