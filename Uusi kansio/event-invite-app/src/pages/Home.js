import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  doc, collection, query, getDocs, getDoc, updateDoc, deleteDoc,
  where, orderBy, limit, arrayUnion, arrayRemove,
  serverTimestamp, Timestamp 
} from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';

// Komponentit
import PageContainer from '../components/layout/pagecontainer/PageContainer';
import EventList from '../components/events/eventlist/EventList';
import EventDetailsModal from '../components/modals/eventdetails/EventDetailsModal';
import InviteUserModal from '../components/modals/InviteUserModal';
import CreateEventModal from '../components/modals/CreateEventModal';
import CreateInvitationModal from '../components/modals/CreateInviteModal';
import InviteCard from '../components/invitations/invitecard/InviteCard';
import InviteChatModal from '../components/modals/InviteChatModal';

// Tyylitiedostot
import '../styles/Home.css';

const Home = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // ===== TILA ===== //
  
  // Yleiset tilamuuttujat
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  
  // Tapahtumiin liittyvät tilamuuttujat
  const [userEvents, setUserEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Kutsuihin liittyvät tilamuuttujat
  const [userInvitations, setUserInvitations] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [existingInvite, setExistingInvite] = useState(null);
  const [checkingInvites, setCheckingInvites] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Chatiin liittyvät tilamuuttujat
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState(null);
  
  // Modal-tilamuuttujat
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, eventId: null });
  const [inviteModal, setInviteModal] = useState({ isOpen: false, eventId: null, eventTitle: null });
  const [createModal, setCreateModal] = useState(false);
  const [createInvitationModal, setCreateInvitationModal] = useState(false);
  
  // Kehitys/debuggaus tilamuuttuja
  const [debugInfo, setDebugInfo] = useState(null);
  
  // Käyttäjän tiedot
  const [userPreferences, setUserPreferences] = useState({
    location: '',
    preferredCategories: []
  });

  // ===== EFEKTIT ===== //

  // Haetaan käyttäjän tapahtumat ja kutsut, kun käyttäjä kirjautuu sisään
  useEffect(() => {
    if (currentUser) {
      loadUserPreferences();
      fetchUserEvents();
      fetchUserInvitations();
      checkExistingInvite();
    }
  }, [currentUser]);
  
  // Päivitä kutsut säännöllisesti ja kun käyttäjä palaa sovellukseen
  useEffect(() => {
    if (!currentUser) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Käyttäjä palasi sovellukseen - päivitetään kutsut");
        fetchUserInvitations();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Päivitä kutsut 5 minuutin välein
    const intervalId = setInterval(() => {
      console.log("Automaattinen kutsujen päivitys");
      fetchUserInvitations();
    }, 5 * 60 * 1000); // 5 minuuttia
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [currentUser]);

  // ===== KUTSUJEN HALLINTA ===== //

  // Ladataan käyttäjän preferenssit
  const loadUserPreferences = async () => {
    if (!currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserPreferences({
          location: userData.location || '',
          preferredCategories: userData.preferredCategories || []
        });
        
        console.log("Ladattu käyttäjän preferenssit:", {
          location: userData.location || '',
          categories: userData.preferredCategories || []
        });
      }
    } catch (err) {
      console.error("Virhe käyttäjän preferenssien latauksessa:", err);
    }
  };

  // Tarkistetaan, onko käyttäjällä jo aktiivinen kutsu
  const checkExistingInvite = async () => {
    if (!currentUser) return;
    
    try {
      setCheckingInvites(true);
      
      const q = query(
        collection(db, 'openInvitations'),
        where('createdBy', '==', currentUser.uid),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Käyttäjällä on jo aktiivinen kutsu
        const inviteData = {
          id: querySnapshot.docs[0].id,
          ...querySnapshot.docs[0].data()
        };
        setExistingInvite(inviteData);
      } else {
        setExistingInvite(null);
      }
    } catch (error) {
      console.error("Error checking existing invites:", error);
    } finally {
      setCheckingInvites(false);
    }
  };

  // Haetaan käyttäjän kutsut
  const fetchUserInvitations = async () => {
    if (!currentUser) return;
    
    try {
      setInvitesLoading(true);
      console.log("Haetaan kutsuja käyttäjälle:", currentUser.uid);
      const debug = {};
      
      let allInvites = [];
      
      // 1. Haetaan henkilökohtaiset kutsut
      try {
        const personalInvitesQuery = query(
          collection(db, 'invites'),
          where('recipientId', '==', currentUser.uid),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        
        const personalInvitesSnapshot = await getDocs(personalInvitesQuery);
        const personalInvites = personalInvitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'personal'
        }));
        
        debug.personalInvitesCount = personalInvites.length;
        allInvites = [...personalInvites];
      } catch (err) {
        console.error("Error fetching personal invites:", err);
        debug.personalInvitesError = err.message;
      }
      
      // 2. Haetaan avoimet kutsut, joihin käyttäjä on vastannut
      try {
        const openInvitesQuery = query(
          collection(db, 'openInvitations'),
          where('responderId', '==', currentUser.uid),
          limit(10)
        );
        
        const openInvitesSnapshot = await getDocs(openInvitesQuery);
        const respondedInvites = openInvitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'open'
        }));
        
        debug.respondedInvitesCount = respondedInvites.length;
        allInvites = [...allInvites, ...respondedInvites];
      } catch (err) {
        console.error("Error fetching responded invites:", err);
        debug.respondedInvitesError = err.message;
      }
      
      // 3. Haetaan käyttäjän luomat avoimet kutsut
      try {
        const createdInvitesQuery = query(
          collection(db, 'openInvitations'),
          where('createdBy', '==', currentUser.uid),
          limit(10)
        );
        
        const createdInvitesSnapshot = await getDocs(createdInvitesQuery);
        const createdInvites = createdInvitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'open'
        }));
        
        debug.createdInvitesCount = createdInvites.length;
        
        // Lisää luodut kutsut listaan, jos niitä ei ole jo lisätty
        createdInvites.forEach(invite => {
          if (!allInvites.some(i => i.id === invite.id)) {
            allInvites.push(invite);
          }
        });
      } catch (err) {
        console.error("Error fetching created invites:", err);
        debug.createdInvitesError = err.message;
      }
      
      // 4. Haetaan avoimet kutsut alueelta - KORJATTU KOHTA
      try {
        // KORJAUS: Yksinkertaistettu kysely löytää enemmän kutsuja
        const areaInvitesQuery = query(
          collection(db, 'openInvitations'),
          orderBy('createdAt', 'desc'),
          limit(20) // Haetaan enemmän, jotta suodattamisen jälkeen jää riittävästi
        );
        
        const areaInvitesSnapshot = await getDocs(areaInvitesQuery);
        debug.totalAreaInvitesFetched = areaInvitesSnapshot.docs.length;
        
        console.log(`Löydetty ${areaInvitesSnapshot.docs.length} alueen kutsua`);
        
        // Haetaan käyttäjän tiedot suodattamista varten
        const userPrefs = userPreferences;
        const userLocationLower = (userPrefs.location || '').toLowerCase().trim();
        const userCategories = userPrefs.preferredCategories || [];
        
        // Suodatetaan kutsut joustavammin
        const areaInvites = areaInvitesSnapshot.docs
          .map(doc => {
            const data = doc.data();
            // Logita jokaisen kutsun tärkeimmät kentät
            console.log(`Kutsu ${doc.id}: title=${data.title}, isActive=${data.isActive}, category=${data.category}, location=${data.location}`);
            return {
              id: doc.id,
              ...data,
              type: 'open'
            };
          })
          .filter(invite => {
            // TÄRKEÄ KORJAUS: Tarkista isActive oikein (sekä boolean että string "true" hyväksytään)
            const isActiveValue = invite.isActive === true || invite.isActive === "true";
            if (!isActiveValue) {
              console.log(`Kutsu ${invite.id} hylätty: ei aktiivinen (isActive=${invite.isActive})`);
              return false;
            }
            
            // Älä näytä käyttäjälle hänen omia kutsujaan
            if (invite.createdBy === currentUser.uid) {
              console.log(`Kutsu ${invite.id} hylätty: oma kutsu`);
              return false;
            }
            
            // Älä näytä kutsuja, joihin käyttäjä on jo vastannut
            if (invite.responderId === currentUser.uid) {
              console.log(`Kutsu ${invite.id} hylätty: jo vastattu`);
              return false;
            }
            
            // Tarkista voimassaolo - KORJATTU
            try {
              const now = new Date();
              let createdAt;
              
              if (invite.createdAt?.toDate) {
                createdAt = invite.createdAt.toDate();
              } else if (invite.createdAt instanceof Date) {
                createdAt = invite.createdAt;
              } else if (typeof invite.createdAt === 'string') {
                createdAt = new Date(invite.createdAt);
              } else {
                // Jos päivämäärä puuttuu kokonaan, näytä kutsu varmuuden vuoksi
                console.log(`Kutsu ${invite.id}: päivämäärä puuttuu, näytetään silti`);
                return true;
              }
              
              // Tarkista availabilityHours - jos ei määritetty, oleta 24h
              const availabilityHours = invite.availabilityHours || 24;
              const expiryTime = createdAt.getTime() + (availabilityHours * 60 * 60 * 1000);
              const stillValid = now.getTime() < expiryTime;
              
              if (!stillValid) {
                console.log(`Kutsu ${invite.id} hylätty: vanhentunut (luotu ${createdAt.toLocaleString()})`);
                return false;
              }
            } catch (err) {
              // Jos päivämäärän käsittelyssä on ongelmia, näytä kutsu varmuuden vuoksi
              console.warn("Error checking invitation validity for invite", invite.id, err);
              return true;
            }
            
            // KORJAUS: Joustavampi sijaintitäsmäys
            const inviteLocationLower = (invite.location || '').toLowerCase().trim();
            
            // Sijainti täsmää jos:
            // 1. Joko käyttäjällä tai kutsulla ei ole määritetty sijaintia TAI
            // 2. Sijainnit sisältävät toisiaan
            let locationMatch = !userLocationLower || !inviteLocationLower || 
                              inviteLocationLower.includes(userLocationLower) || 
                              userLocationLower.includes(inviteLocationLower);
            
            // KORJAUS: Parempi kategoriatäsmäys
            const inviteCategory = (invite.category || '').toLowerCase().trim();
            const userCategoriesLower = (userPrefs.preferredCategories || []).map(cat => 
              cat.toLowerCase().trim()
            );
            
            // Kategoriat täsmäävät jos:
            // 1. Käyttäjällä ei ole preferenssi-kategorioita TAI
            // 2. Kutsulla ei ole kategoriaa TAI
            // 3. Kutsu kuuluu johonkin käyttäjän preferenssikategoriaan (case-insensitive)
            const categoryMatch = 
              userCategoriesLower.length === 0 || 
              !inviteCategory || 
              userCategoriesLower.some(cat => inviteCategory.includes(cat) || cat.includes(inviteCategory));
            
            // Log täsmäystiedot
            console.log(`Kutsu ${invite.id} (${invite.title || 'Ei otsikkoa'}): 
              - Sijainti: ${locationMatch ? 'TÄSMÄÄ' : 'EI TÄSMÄÄ'} (user: ${userLocationLower}, invite: ${inviteLocationLower})
              - Kategoria: ${categoryMatch ? 'TÄSMÄÄ' : 'EI TÄSMÄÄ'} (user: ${userCategoriesLower.join(',')}, invite: ${inviteCategory})
              - Lopullinen päätös: ${locationMatch && categoryMatch ? 'NÄYTETÄÄN' : 'HYLÄTÄÄN'}`);
            
            return categoryMatch && locationMatch;
          });
   
        debug.filteredAreaInvites = areaInvites.length;
        debug.filters = {
          userLocation: userLocationLower,
          userCategories: userCategories
        };
        
        console.log("Suodatetut kutsut:", {
          yhteensä: areaInvitesSnapshot.docs.length,
          suodatuksen_jälkeen: areaInvites.length,
          käyttäjän_sijainti: userLocationLower,
          käyttäjän_kategoriat: userCategories,
          hyväksytyt_kutsut: areaInvites.map(invite => ({
            id: invite.id, 
            title: invite.title,
            category: invite.category,
            location: invite.location
          }))
        });
        
        // Lisää alueen kutsut listaan, jos niitä ei ole jo lisätty
        areaInvites.forEach(invite => {
          if (!allInvites.some(i => i.id === invite.id)) {
            allInvites.push(invite);
          }
        });
      } catch (err) {
        console.error("Error fetching area invites:", err);
        debug.areaInvitesError = err.message;
      }
      
      // 5. Järjestä kutsut (hyväksytyt ensin, sitten päivämäärän mukaan)
      allInvites.sort((a, b) => {
        // Järjestys: 1. hyväksytyt, 2. odottavat, 3. hylätyt
        if (a.status === 'accepted' && b.status !== 'accepted') return -1;
        if (a.status !== 'accepted' && b.status === 'accepted') return 1;
        
        // Jos status on sama, järjestä päivämäärän mukaan
        const dateA = a.date?.toDate?.() || a.createdAt?.toDate?.() || new Date();
        const dateB = b.date?.toDate?.() || b.createdAt?.toDate?.() || new Date();
        return dateB - dateA;
      });
      
      // Päivitä debug-infot
      setDebugInfo({
        invitations: {
          total: allInvites.length,
          personal: debug.personalInvitesCount || 0,
          responded: debug.respondedInvitesCount || 0,
          created: debug.createdInvitesCount || 0,
          area: debug.filteredAreaInvites || 0
        },
        userPreferences: {
          location: userPreferences.location || 'ei määritetty',
          categories: userPreferences.preferredCategories || []
        },
        filtering: {
          totalAreaFetched: debug.totalAreaInvitesFetched || 0,
          afterFiltering: debug.filteredAreaInvites || 0
        }
      });
    
      setUserInvitations(allInvites);
      
    } catch (error) {
      console.error('Error fetching user invitations:', error);
      setDebugInfo({ error: error.message });
      showFeedback('Failed to load your invitations', true);
    } finally {
      setInvitesLoading(false);
    }
  };

  // Kutsun tilan muuttaminen (hyväksyminen/hylkääminen)
  const handleInviteStatusChange = async (inviteId, newStatus) => {
    if (!currentUser) return;
    
    try {
      const invite = userInvitations.find(inv => inv.id === inviteId);
      
      if (!invite) {
        console.error('Invitation not found:', inviteId);
        return;
      }
      
      // Testikutsut käsitellään erikseen (ei tallenneta tietokantaan)
      if (invite.type === 'test') {
        const updatedInvitations = userInvitations.map(inv => 
          inv.id === inviteId ? { ...inv, status: newStatus } : inv
        );
        setUserInvitations(updatedInvitations);
        showFeedback(`Test invitation ${newStatus === 'accepted' ? 'accepted' : 'declined'}`);
        
        // Jos hyväksyttiin testikutsu, avataan chat-näkymä
        if (newStatus === 'accepted') {
          handleOpenChat(invite);
        }
        
        return;
      }
      
      // Määritä oikea kokoelma tyypin perusteella
      const collectionName = invite.type === 'personal' ? 'invites' : 'openInvitations';
      const inviteRef = doc(db, collectionName, inviteId);
      
      // Päivitä kutsu Firestoressa
      await updateDoc(inviteRef, {
        status: newStatus,
        respondedAt: serverTimestamp(),
        responderId: currentUser.uid
      });
      
      // Päivitä paikallinen tila
      const updatedInvitations = userInvitations.map(inv => 
        inv.id === inviteId ? { 
          ...inv, 
          status: newStatus,
          respondedAt: Timestamp.fromDate(new Date()),
          responderId: currentUser.uid
        } : inv
      );
      
      setUserInvitations(updatedInvitations);
      
      showFeedback(`Invitation ${newStatus === 'accepted' ? 'accepted' : 'declined'} successfully!`);
      
      // Jos kutsu hyväksytään, avataan chat-näkymä
      if (newStatus === 'accepted') {
        handleOpenChat(invite);
      }
    } catch (error) {
      console.error(`Error ${newStatus === 'accepted' ? 'accepting' : 'declining'} invitation:`, error);
      showFeedback('Failed to update invitation status. Please try again.', true);
    }
  };
  
  // Chat-modaalin avaaminen kutsulle
  const handleOpenChat = (invite) => {
    setSelectedInvite(invite);
    setChatModalOpen(true);
  };
  
  // Chat-modaalin sulkeminen
  const handleCloseChat = () => {
    setChatModalOpen(false);
    setSelectedInvite(null);
  };

  // ===== TAPAHTUMIEN HALLINTA ===== //

  // Haetaan käyttäjän tapahtumat
  const fetchUserEvents = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Hae tapahtumat, joissa käyttäjä on osallistujana
      const eventsQuery = query(
        collection(db, 'events'),
        where('participants', 'array-contains', currentUser.uid),
        orderBy('date', 'desc'),
        limit(5)
      );
      
      const snapshot = await getDocs(eventsQuery);
      setUserEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching user events:', error);
      showFeedback('Failed to load your events', true);
    } finally {
      setLoading(false);
    }
  };

  // Tapahtumaan liittyminen
  const handleJoinEvent = async (eventId) => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/', message: 'Please log in to join events' } });
      return;
    }
    
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        participants: arrayUnion(currentUser.uid)
      });
      
      showFeedback('You have successfully joined the event!');
      fetchUserEvents();
    } catch (error) {
      console.error('Error joining event:', error);
      showFeedback('Failed to join the event. Please try again.', true);
    }
  };

  // Tapahtumasta poistuminen
  const handleLeaveEvent = async (eventId) => {
    if (!currentUser) return;
    
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        participants: arrayRemove(currentUser.uid)
      });
      
      showFeedback('You have left the event');
      fetchUserEvents();
    } catch (error) {
      console.error('Error leaving event:', error);
      showFeedback('Failed to leave the event. Please try again.', true);
    }
  };

  // ===== MODAALIT ===== //

  // Tapahtuman tiedot -modaalin hallinta
  const openDetailsModal = (eventId) => {
    setDetailsModal({ isOpen: true, eventId });
  };

  const closeDetailsModal = () => {
    setDetailsModal({ isOpen: false, eventId: null });
  };

  // Kutsu käyttäjä -modaalin hallinta
  const openInviteModal = (eventId, eventTitle) => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/', message: 'Please log in to invite others' } });
      return;
    }
    
    setInviteModal({ isOpen: true, eventId, eventTitle });
  };

  const closeInviteModal = () => {
    setInviteModal({ isOpen: false, eventId: null, eventTitle: null });
  };

  // Tapahtuman luonti -modaalin hallinta
  const openCreateModal = () => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/', message: 'Please log in to create events' } });
      return;
    }
    
    setCreateModal(true);
  };

  const closeCreateModal = () => {
    setCreateModal(false);
  };

  // Kutsun luonti -modaalin hallinta
  const openCreateInvitationModal = () => {
    if (!currentUser) {
      navigate('/login', { state: { from: '/', message: 'Please log in to create invitations' } });
      return;
    }
    
    if (checkingInvites) {
      showFeedback('Tarkistetaan kutsuja, odota hetki...', false);
      return;
    }
    
    try {
      // Tarkista, onko kutsu jo hyväksytty - mutta ÄLÄ näytä punaista virheilmoitusta
      if (existingInvite && existingInvite.status === 'accepted') {
        // Kutsu on hyväksytty, mutta avataan silti modaali read-only-tilassa
        // Virheilmoitus näytetään itse modaalissa, ei punaisena laatikkona
        setIsEditMode(true);
        setCreateInvitationModal(true);
        return;
      }
      
      // Avaa modaali suoraan ilman virheilmoituksia
      setIsEditMode(existingInvite !== null);
      setCreateInvitationModal(true);
      
      showFeedback(existingInvite ? 'Avataan kutsu muokkausta varten...' : 'Avataan uuden kutsun luonti...');
    } catch (error) {
      console.error('Virhe avattaessa kutsumodaalia:', error);
      showFeedback('Virhe avattaessa kutsumodaalia. Yritä uudelleen.', true);
    }
  };

  const closeCreateInvitationModal = () => {
    setCreateInvitationModal(false);
    setIsEditMode(false);
  };

  // ===== APUFUNKTIOT ===== //

  // Näytä palauteviesti
  const showFeedback = (message, isError = false) => {
    setFeedbackMessage({
      text: message,
      isError
    });
    
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3000);
  };

  // Kutsun tietojen näyttäminen
  const handleViewInvitation = (invite) => {
    if (invite.status === 'accepted') {
      handleOpenChat(invite);
    } else {
      showFeedback(`Viewing invitation: ${invite.title || 'Untitled'}`);
    }
  };
  
  // Kutsun poistaminen
  const handleDeleteInvitation = async (inviteId, inviteType) => {
    if (!currentUser) return;
    
    try {
      console.log('Poistetaan kutsu:', { inviteId, inviteType });
      
      // Jos tyyppiä ei ole määritetty, oletetaan että kyseessä on avoin kutsu
      const collectionName = inviteType === 'personal' ? 'invites' : 'openInvitations';
      const inviteRef = doc(db, collectionName, inviteId);
      
      // Poista kutsu Firestoresta
      await deleteDoc(inviteRef);
      
      // Päivitä paikallinen tila poistamalla kutsu
      setUserInvitations(prev => prev.filter(inv => inv.id !== inviteId));
      
      // Sulje modaali ja päivitä tilat
      setCreateInvitationModal(false);
      setIsEditMode(false);
      setExistingInvite(null);
      
      // Näytä onnistumisilmoitus
      showFeedback('Kutsu poistettu onnistuneesti!');
      
      // Tarkista, onko käyttäjällä vielä aktiivisia kutsuja
      checkExistingInvite();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      showFeedback('Kutsun poistaminen epäonnistui. Yritä uudelleen.', true);
    }
  };

  // Päivitä kutsut-toiminto
  const refreshInvitations = () => {
    fetchUserInvitations();
    showFeedback('Kutsut päivitetty');
  };

  // ===== RENDERÖINTI ===== //
  return (
    <PageContainer>
      {/* Kehittäjän työkalut - näkyy vain dev-ympäristössä */}
      {process.env.NODE_ENV !== 'production' && (
        <div style={{ 
          margin: '10px 0', 
          padding: '15px', 
          backgroundColor: '#f0f8ff', 
          border: '1px solid #ddd',
          borderRadius: '5px'
        }}>
          <h3 style={{ marginTop: 0 }}>Kehittäjän työkalut</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
            <button 
              onClick={() => {
                fetchUserInvitations();
                showFeedback('Kutsut päivitetty');
              }}
              style={{ 
                padding: '8px 12px', 
                backgroundColor: '#007bff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Päivitä kutsut
            </button>
            
            <button 
              onClick={async () => {
                try {
                  // Hae kaikki kutsut ilman suodatusta
                  const snapshot = await getDocs(collection(db, 'openInvitations'));
                  console.log(`Kaikki kutsut (${snapshot.size}):`, 
                    snapshot.docs.map(doc => ({
                      id: doc.id, 
                      ...doc.data(), 
                      createdAt: doc.data().createdAt?.toDate?.() 
                        ? doc.data().createdAt.toDate().toLocaleString() 
                        : 'Ei aikaleimaa'
                    }))
                  );
                  
                  showFeedback(`Haettiin ${snapshot.size} kutsua. Katso konsoli.`);
                } catch (err) {
                  console.error("Virhe kutsujen haussa:", err);
                  showFeedback('Virhe kutsuja haettaessa: ' + err.message, true);
                }
              }}
              style={{ 
                padding: '8px 12px', 
                backgroundColor: '#28a745', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer' 
              }}
            >
              Näytä kaikki kutsut
            </button>
          </div>
          
          <details>
            <summary style={{ fontWeight: 'bold', cursor: 'pointer' }}>Näytä suodatusasetukset</summary>
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
              <p><strong>Käyttäjän sijainti:</strong> {userPreferences.location || 'ei määritetty'}</p>
              <p><strong>Käyttäjän kategoriat:</strong> {userPreferences.preferredCategories?.length 
                ? userPreferences.preferredCategories.join(', ') 
                : 'ei kategorioita'}</p>
              
              <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #ddd' }} />
              
              <p>Kutsujen suodatuksessa otetaan huomioon:</p>
              <ul style={{ paddingLeft: '20px' }}>
                <li>Kutsu on aktiivinen (isActive = true tai "true")</li>
                <li>Kutsu ei ole vanhentunut (availabilityHours ei ylittynyt)</li>
                <li>Kutsu ei ole käyttäjän oma</li>
                <li>Käyttäjä ei ole jo vastannut kutsuun</li>
                <li>Sijainti tai kategoria täsmää käyttäjän preferensseihin (väljä vertailu)</li>
              </ul>
            </div>
          </details>
        </div>
      )}

      {/* Etusivun hero-osio */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Löydä oman alueesi ihmiset -Tapahtumien ja kutsujen avulla</h1>
          <p>Selaa tapahtumia lähelläsi, luo kutsuja ja kutsu muita mukaan aktiviteetteihin!</p>
          
          <div className="hero-actions">
            <button className="btn-primary" onClick={openCreateModal}>
              Luo Tapahtuma
            </button>
            <button className="btn-secondary" onClick={openCreateInvitationModal}>
              {checkingInvites ? 'Tarkistetaan...' : existingInvite ? 'Muokkaa kutsua' : 'Luo kutsu'}
            </button>
          </div>
        </div>
      </section>

      {/* Palauteviesti */}
      {feedbackMessage && (
        <div className={`feedback-message ${feedbackMessage.isError ? 'error' : 'success'}`}>
          {feedbackMessage.text}
        </div>
      )}
      
      {/* Tulevat tapahtumat */}
      <section className="featured-events">
        <div className="section-header">
          <h2>Tulevat tapahtumat</h2>
          <button className="view-all-btn" onClick={() => navigate('/events')}>
            Näytä kaikki
          </button>
        </div>
        
        <EventList 
          maxEvents={6}
          showCategory={true}
          onJoin={handleJoinEvent}
          onLeave={handleLeaveEvent}
          onOpenDetails={openDetailsModal}
          onInvite={(eventId) => {
            const event = document.getElementById(`event-${eventId}`);
            const title = event ? event.querySelector('.event-title').textContent : 'Event';
            openInviteModal(eventId, title);
          }}
        />
      </section>
      
      {/* Kutsut-osio (näytetään vain kirjautuneille käyttäjille) */}
      {currentUser && (
        <section className="invitations-section">
          <div className="section-header">
            <h2>Kutsusi</h2>
            <div>
              <button 
                className="refresh-btn" 
                onClick={refreshInvitations}
                style={{ marginRight: '10px', fontSize: '14px' }}
              >
                Päivitä
              </button>
              <button 
                className="view-all-btn" 
                onClick={() => navigate('/invites')}
              >
                Näytä kaikki
              </button>
            </div>
          </div>
          
          {/* Debug-paneeli (näytetään vain kehitysvaiheessa) */}
          {process.env.NODE_ENV !== 'production' && debugInfo && (
            <div className="debug-panel">
              <details>
                <summary>Debug Info</summary>
                <div className="debug-content">
                  <h4>Kutsujen määrät:</h4>
                  <ul>
                    <li>Yhteensä: {debugInfo.invitations?.total || 0}</li>
                    <li>Henkilökohtaiset: {debugInfo.invitations?.personal || 0}</li>
                    <li>Vastatut: {debugInfo.invitations?.responded || 0}</li>
                    <li>Luodut: {debugInfo.invitations?.created || 0}</li>
                    <li>Alueen: {debugInfo.invitations?.area || 0}</li>
                  </ul>
                  
                  <h4>Käyttäjän preferenssit:</h4>
                  <ul>
                    <li>Sijainti: {debugInfo.userPreferences?.location || 'ei määritetty'}</li>
                    <li>Kategoriat: {debugInfo.userPreferences?.categories?.join(', ') || 'ei kategorioita'}</li>
                  </ul>
                  
                  <h4>Aluekutsujen suodatus:</h4>
                  <ul>
                    <li>Haettu yhteensä: {debugInfo.filtering?.totalAreaFetched || 0}</li>
                    <li>Suodatuksen jälkeen: {debugInfo.filtering?.afterFiltering || 0}</li>
                  </ul>
                  
                  <button onClick={refreshInvitations} className="debug-refresh-btn">
                    Päivitä kutsut
                  </button>
                </div>
              </details>
            </div>
          )}
          
          {/* Kutsujen näyttäminen */}
          {invitesLoading ? (
            <div className="loading-spinner">Ladataan kutsuja...</div>
          ) : userInvitations.length > 0 ? (
            <div className="invitations-grid">
              {/* Näytetään maksimissaan 3 kutsua etusivulla */}
              {userInvitations.slice(0, 3).map(invite => (
                <InviteCard 
                  key={invite.id}
                  invite={invite}
                  onStatusChange={handleInviteStatusChange}
                  onViewEvent={() => handleViewInvitation(invite)}
                  onOpenChat={handleOpenChat}
                  showChatOption={true}
                />
              ))}
              
              {/* "Näytä lisää" -painike, jos kutsuja on enemmän kuin 3 */}
              {userInvitations.length > 3 && (
                <div className="more-invites">
                  <p>+ {userInvitations.length - 3} more invitations</p>
                  <button 
                    className="btn-secondary btn-sm"
                    onClick={() => navigate('/invites')}
                  >
                    Näytä kaikki kutsut
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="no-invites">
              <p className="cta-message">Sinulla ei ole vielä kutsuja.</p>
              <button 
                className="btn-secondary"
                onClick={openCreateInvitationModal}
              >
                {checkingInvites ? 'Tarkistetaan...' : existingInvite ? 'Muokkaa kutsua' : 'Luo uusi kutsu'}
              </button>
            </div>
          )}
        </section>
      )}
      
      {/* Omat tapahtumat -osio (näytetään vain kirjautuneille käyttäjille) */}
      {currentUser && (
        <section className="your-events">
          <div className="section-header">
            <h2>Omat tapahtumasi</h2>
            {userEvents.length > 3 && (
              <button className="view-all-btn" onClick={() => navigate('/events/my')}>
                Näytä kaikki
              </button>
            )}
          </div>
          
          {/* Käyttäjän tapahtumien näyttäminen */}
          {loading ? (
            <div className="loading-spinner">Ladataan tapahtumiasi...</div>
          ) : userEvents.length > 0 ? (
            <div className="user-events-grid">
              {userEvents.map(event => (
                <div key={event.id} id={`event-${event.id}`} className="event-card user-event">
                  <h3 className="event-title">{event.title}</h3>
                  <p className="event-date">
                    {event.date?.toDate?.() ? new Date(event.date.toDate()).toLocaleDateString() : 'Päivämäärä ei saatavilla'}
                  </p>
                  <div className="event-actions">
                    <button 
                      className="btn-secondary btn-sm"
                      onClick={() => openDetailsModal(event.id)}
                    >
                      Näytä tiedot
                    </button>
                    <button 
                      className="btn-primary btn-sm"
                      onClick={() => openInviteModal(event.id, event.title)}
                    >
                      Kutsu ystäviä
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-events">
              <p className="cta-message">Et ole vielä liittynyt mihinkään tapahtumiin. Luo uusi tai selaa olemassa olevia!</p>
            </div>
          )}
          
          {/* Toimintopainikkeet */}
          <div className="action-buttons">
            <button className="btn-primary centered" onClick={openCreateModal}>
              Luo uusi tapahtuma
            </button>
            <button className="btn-create-invite" onClick={openCreateInvitationModal}>
              {checkingInvites ? 'Tarkistetaan...' : existingInvite ? 'Muokkaa kutsua' : 'Luo uusi kutsu'}
            </button>
          </div>
        </section>
      )}
      
      {/* Modaalit */}
      <EventDetailsModal 
        isOpen={detailsModal.isOpen} 
        onClose={closeDetailsModal} 
        eventId={detailsModal.eventId} 
        onJoin={handleJoinEvent}
        onLeave={handleLeaveEvent}
      />
      
      <InviteUserModal 
        isOpen={inviteModal.isOpen}
        onClose={closeInviteModal}
        eventId={inviteModal.eventId}
        eventTitle={inviteModal.eventTitle}
      />
      
      <CreateEventModal 
        isOpen={createModal}
        onClose={closeCreateModal}
        onSuccess={() => {
          showFeedback('Tapahtuma luotu onnistuneesti!');
          fetchUserEvents();
        }}
      />
      
      {/* CreateInvitationModal-komponentin propsit */}
      <CreateInvitationModal
        isOpen={createInvitationModal}
        onClose={() => {
          console.log('Suljetaan kutsumodaali');
          setCreateInvitationModal(false);
          setIsEditMode(false);
        }}
        onSuccess={() => {
          showFeedback(isEditMode ? 'Kutsu päivitetty onnistuneesti!' : 'Kutsu luotu onnistuneesti!');
          fetchUserInvitations();
          checkExistingInvite();
        }}
        onDelete={handleDeleteInvitation}
        existingInvite={existingInvite}
        isEditMode={isEditMode}
      />
      
      {/* Chat-modaali */}
      {selectedInvite && (
        <InviteChatModal
          isOpen={chatModalOpen}
          onClose={handleCloseChat}
          inviteId={selectedInvite.id}
          inviteType={selectedInvite.type || 'open'}
        />
      )}
    </PageContainer>
  );
};

export default Home;