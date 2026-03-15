// ============================================================================
// FILE 1: debate-ui/src/components/NameSetupModal.jsx  (NEW FILE)
// ============================================================================
// Show this modal the first time a user opens the app (username is null).
// On Landing.jsx, fetch the user profile and if username is null, show this.

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CYPRUS = '#004643';
const SAND = '#F0EDE5';
const DUMMY_USER_ID = '8f3c2e7b-6b4a-4c9a-9e6f-2d5c1a8f7e42';

export default function NameSetupModal({ isOpen, onComplete }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a name'); return; }
    if (trimmed.length < 2) { setError('Name must be at least 2 characters'); return; }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/user/${DUMMY_USER_ID}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });
      if (!res.ok) throw new Error('Failed to save');
      onComplete(trimmed);
    } catch (e) {
      setError('Could not save name. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="w-full max-w-sm rounded-3xl p-8 flex flex-col gap-6"
              style={{
                backgroundColor: SAND,
                pointerEvents: 'all',
                boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
              }}
            >
              <link
                href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Sans:wght@400;500;600&display=swap"
                rel="stylesheet"
              />

              {/* Avatar placeholder */}
              <div className="flex justify-center">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black"
                  style={{
                    backgroundColor: CYPRUS,
                    color: SAND,
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}
                >
                  {name.trim().charAt(0).toUpperCase() || '?'}
                </div>
              </div>

              {/* Heading */}
              <div className="text-center">
                <h2
                  className="text-3xl font-black uppercase tracking-tight"
                  style={{ color: CYPRUS, fontFamily: "'Barlow Condensed', sans-serif" }}
                >
                  What's your name?
                </h2>
                <p
                  className="text-sm mt-2"
                  style={{ color: 'rgba(0,70,67,0.55)', fontFamily: "'DM Sans', sans-serif" }}
                >
                  We'll use this to personalize your experience.
                </p>
              </div>

              {/* Input */}
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(''); }}
                  onKeyDown={handleKey}
                  placeholder="Enter your name…"
                  maxLength={50}
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl text-base outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(0,70,67,0.07)',
                    border: error ? '2px solid #ef4444' : '2px solid rgba(0,70,67,0.15)',
                    color: CYPRUS,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                />
                {error && (
                  <p className="text-xs text-red-500" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {error}
                  </p>
                )}
              </div>

              {/* Button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold uppercase tracking-widest text-sm transition-all"
                style={{
                  backgroundColor: CYPRUS,
                  color: SAND,
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Saving…' : "Let's Go →"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


// ============================================================================
// FILE 2: Changes needed in debate-ui/src/pages/Landing.jsx
// ============================================================================

/*
1. Add import at the top:
   import NameSetupModal from '../components/NameSetupModal';

2. Add state inside Landing():
   const [showNameModal, setShowNameModal] = useState(false);
   const [username, setUsername] = useState(null);

3. Add useEffect to check if user has a name (add after existing imports/state):

   useEffect(() => {
     const checkUser = async () => {
       try {
         const res = await fetch(`http://127.0.0.1:8000/api/user/${DUMMY_USER_ID}/profile`);
         const data = await res.json();
         if (!data.user.username) {
           setShowNameModal(true);
         } else {
           setUsername(data.user.username);
         }
       } catch (e) {
         // backend not ready yet, skip
       }
     };
     checkUser();
   }, []);

4. Add the DUMMY_USER_ID constant at top of Landing():
   const DUMMY_USER_ID = '8f3c2e7b-6b4a-4c9a-9e6f-2d5c1a8f7e42';

5. Add modal to JSX (just before the closing </div> of the return):
   <NameSetupModal
     isOpen={showNameModal}
     onComplete={(name) => {
       setUsername(name);
       setShowNameModal(false);
     }}
   />
*/


// ============================================================================
// FILE 3: Changes needed in debate-ui/src/pages/Profile.jsx
// ============================================================================

/*
Add an edit button to the hero card so users can update their name from Profile too.

1. Add this state inside Profile():
   const [editingName, setEditingName] = useState(false);
   const [nameInput, setNameInput] = useState('');
   const [savingName, setSavingName] = useState(false);

2. Add this function inside Profile():

   const handleSaveName = async () => {
     const trimmed = nameInput.trim();
     if (!trimmed) return;
     setSavingName(true);
     try {
       const res = await fetch(`http://127.0.0.1:8000/api/user/${DUMMY_USER_ID}/update`, {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ username: trimmed }),
       });
       if (res.ok) {
         setProfile(prev => ({
           ...prev,
           user: { ...prev.user, username: trimmed }
         }));
         setEditingName(false);
       }
     } finally {
       setSavingName(false);
     }
   };

3. In the hero card JSX, replace the username display:

   FIND:
   <p className="text-2xl font-black uppercase tracking-tight">
     {user.username || 'Debater'}
   </p>

   REPLACE WITH:
   {editingName ? (
     <div className="flex items-center gap-2 mt-1">
       <input
         autoFocus
         value={nameInput}
         onChange={e => setNameInput(e.target.value)}
         onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
         className="px-3 py-1.5 rounded-lg text-sm font-semibold outline-none"
         style={{ backgroundColor: 'rgba(240,237,229,0.15)', color: SAND, border: '1px solid rgba(240,237,229,0.3)', fontFamily: "'DM Sans',sans-serif", width: '180px' }}
         maxLength={50}
       />
       <button onClick={handleSaveName} disabled={savingName}
         className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase"
         style={{ backgroundColor: 'rgba(240,237,229,0.2)', color: SAND, fontFamily: "'DM Sans',sans-serif" }}>
         {savingName ? '…' : 'Save'}
       </button>
       <button onClick={() => setEditingName(false)}
         className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase"
         style={{ backgroundColor: 'rgba(240,237,229,0.1)', color: 'rgba(240,237,229,0.6)', fontFamily: "'DM Sans',sans-serif" }}>
         Cancel
       </button>
     </div>
   ) : (
     <div className="flex items-center gap-2">
       <p className="text-2xl font-black uppercase tracking-tight">
         {user.username || 'Debater'}
       </p>
       <button
         onClick={() => { setNameInput(user.username || ''); setEditingName(true); }}
         className="opacity-50 hover:opacity-100 transition-opacity"
         title="Edit name"
       >
         <Pencil size={14} color={SAND} />
       </button>
     </div>
   )}

4. Add Pencil to lucide-react imports at the top:
   import { ..., Pencil } from 'lucide-react';
*/