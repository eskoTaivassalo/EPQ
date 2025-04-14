import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../../services/firebase/config';
import InviteCard from '../invitecard/InviteCard';
import './InviteList.css';

const InviteList = ({ onViewEvent, onStatusChange }) => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});

  // Lisää kutsujen hakeminen heti kun komponentti latautuu
  useEffect(() => {
    const loadData = async () => {
      // Odota että Firebase Auth on varmasti alustettu
      if (auth.currentUser) {
        fetchInvites();
      } else {
        // Odota hetki ja yritä uudelleen, jos käyttäjä ei ole vielä valmis
        setTimeout(() => {
          if (auth.currentUser) {
            fetchInvites();
          } else {
            setError("Käyttäjää ei ole kirjautunut");
            setLoading(false);
          }
        }, 1000);
      }
    };
    
    loadData();
  }, []);

  const fetchInvites = async () => {
    try {
      setLoading(true);
      console.log("Haetaan kutsuja...");
      
      const debug = {}; // Debug-tiedot
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("User must be logged in to view invites");
      }
      
      console.log("Kirjautunut käyttäjä:", currentUser.uid);
      let allInvites = [];
      
      // Hae KAIKKI henkilökohtaiset kutsut
      try {
        const invitesRef = collection(db, 'invites');
        const invitesQuery = query(invitesRef);
        const invitesSnapshot = await getDocs(invitesQuery);
        
        console.log("Henkilökohtaisia kutsuja löytyi:", invitesSnapshot.size);
        debug.personalInvitesCount = invitesSnapshot.size;
        
        const personalInvites = invitesSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log("Henkilökohtainen kutsu:", doc.id, data);
          return {
            id: doc.id,
            type: 'personal',
            ...data
          };
        });
        
        allInvites = [...personalInvites];
      } catch (err) {
        console.error("Error fetching personal invites:", err);
        debug.personalInvitesError = err.message;
      }
      
      // Hae KAIKKI avoimet kutsut - tämä on erityisen tärkeä
      try {
        console.log("Haetaan avoimet kutsut");
        const openInvitesRef = collection(db, 'openInvitations');
        const openInvitesQuery = query(openInvitesRef);
        
        const openInvitesSnapshot = await getDocs(openInvitesQuery);
        
        console.log("Avoimia kutsuja löytyi:", openInvitesSnapshot.size);
        debug.totalOpenInvitesCount = openInvitesSnapshot.size;
        
        // TÄRKEÄ: Tulostetaan kaikki kutsujen data konsoliin
        openInvitesSnapshot.docs.forEach(doc => {
          console.log("Avoin kutsu:", doc.id, doc.data());
        });
        
        // Kaikki avoimet kutsut ilman mitään suodatusta
        const openInvites = openInvitesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: 'open',
            status: 'pending', // Oletustila avoimille kutsuille
            ...data
          };
        });
        
        debug.allOpenInvitesCount = openInvites.length;
        allInvites = [...allInvites, ...openInvites];
      } catch (err) {
        console.error("Error fetching open invites:", err);
        debug.openInvitesError = err.message;
      }
      
      // Järjestä kutsut päivämäärän mukaan (uusimmat ensin)
      allInvites.sort((a, b) => {
        const dateA = a.date?.toDate?.() || a.createdAt?.toDate?.() || new Date();
        const dateB = b.date?.toDate?.() || b.createdAt?.toDate?.() || new Date();
        return dateB - dateA;
      });
      
      console.log("Lopulliset kutsut:", allInvites);
      debug.finalInvitesCount = allInvites.length;
      debug.finalInvites = allInvites.map(invite => ({
        id: invite.id,
        type: invite.type,
        title: invite.title || "Ei otsikkoa",
        category: invite.category || "Ei kategoriaa"
      }));
      
      setDebugInfo(debug);
      setInvites(allInvites);
      setError(null);
    } catch (err) {
      console.error("Error fetching invites:", err);
      setError("Kutsujen hakeminen epäonnistui: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (inviteId, newStatus) => {
    setInvites(prevInvites => 
      prevInvites.map(invite => 
        invite.id === inviteId 
          ? { ...invite, status: newStatus, respondedAt: new Date() }
          : invite
      )
    );
    
    if (onStatusChange) {
      onStatusChange(inviteId, newStatus);
    }
  };

  if (loading) return <div className="invites-loading">Ladataan kutsuja...</div>;

  // Debug-tyylinen paneeli suoraan näkymässä
  const renderDebugPanel = () => (
    <div style={{
      padding: '15px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #ddd',
      borderRadius: '5px',
      margin: '15px 0',
      fontSize: '14px'
    }}>
      <h3>Debug-tiedot:</h3>
      <p>Kutsuja löytyi yhteensä: {invites.length}</p>
      <p>Auth status: {auth.currentUser ? 'Kirjautunut sisään' : 'Ei kirjautunut'}</p>
      <p>Käyttäjä: {auth.currentUser?.uid}</p>
      <p>Kutsutyypit:</p>
      <ul>
        <li>Henkilökohtaiset: {invites.filter(i => i.type === 'personal').length}</li>
        <li>Avoimet: {invites.filter(i => i.type === 'open').length}</li>
      </ul>
    </div>
  );

  return (
    <div className="invites-container">
      <div className="invites-header">
        <h2>Kutsut (Testinäkymä - kaikki kutsut)</h2>
        <button 
          className="refresh-btn" 
          onClick={fetchInvites}
        >
          Päivitä
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {/* Debug tiedot kehittäjälle */}
      <div className="debug-info">
        <details open>
          <summary>Debug tiedot ({invites.length} kutsua)</summary>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </details>
      </div>
      
      {/* Lisätty Debug-paneeli */}
      {renderDebugPanel()}
      
      {invites.length === 0 ? (
        <div className="no-invites">
          <p>Ei kutsuja tietokannassa.</p>
          <div className="help-text">
            <p>Tietokannassa ei ole yhtään kutsua:</p>
            <ul>
              <li>Kokoelmassa 'invites' ei ole henkilökohtaisia kutsuja</li>
              <li>Kokoelmassa 'openInvitations' ei ole avoimia kutsuja</li>
            </ul>
            <button className="btn-primary" onClick={fetchInvites}>Yritä uudelleen</button>
          </div>
        </div>
      ) : (
        <>
          <p className="info-text">Näytetään kaikki kutsut ilman suodatusta. Yhteensä {invites.length} kutsua.</p>
          <div className="invites-list">
            {/* Lisätty try-catch, jotta yksittäisen kortin renderöintivirhe ei kaada koko näkymää */}
            {invites.map(invite => {
              try {
                return (
                  <InviteCard 
                    key={invite.id}
                    invite={invite}
                    onStatusChange={handleStatusChange}
                    onViewEvent={onViewEvent}
                  />
                );
              } catch (err) {
                console.error("Error rendering invite card:", err, invite);
                return (
                  <div 
                    key={invite.id || 'error'} 
                    className="error-card"
                    style={{
                      border: '2px solid #f44336',
                      padding: '15px',
                      margin: '10px 0',
                      background: '#ffebee'
                    }}
                  >
                    <p>Virhe kutsun näyttämisessä</p>
                    <pre style={{fontSize: '11px'}}>{JSON.stringify(invite, null, 2)}</pre>
                  </div>
                );
              }
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default InviteList;