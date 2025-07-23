document.addEventListener('DOMContentLoaded', () => {
    // --- PASTE YOUR FIREBASE CONFIGURATION HERE ---
    // You will get this from the Firebase console in Step 2
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

    // --- APP INITIALIZATION ---
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // References to Firestore collections
    const generatorsCollection = db.collection('generators');
    const slidesCollection = db.collection('slides');

    // --- LOCAL STATE ---
    // These arrays will be filled with data from Firestore
    let localGenerators = [];
    let localHeroSlides = [];

    // --- CONSTANTS ---
    const ADMIN_CREDENTIALS = { username: "NAA", password: "NAA123" };
    const BUSINESS_NUMBER = "+91 90226 39081";

    // --- FIREBASE REAL-TIME LISTENERS ---
    // Listen for real-time updates on the generators collection
    generatorsCollection.onSnapshot(snapshot => {
        localGenerators = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderGenerators(localGenerators);
        renderAdminGeneratorsList();
    }, err => {
        console.error("Error fetching generators: ", err);
    });

    // Listen for real-time updates on the slides collection
    slidesCollection.onSnapshot(snapshot => {
        localHeroSlides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderHeroSlides();
        startSlider();
    }, err => {
        console.error("Error fetching slides: ", err);
    });


    // --- CORE UI & NAVIGATION ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('active'));

    function showPage(pageId) {
        document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
        document.getElementById(pageId).classList.remove('hidden');
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active', 'bg-gray-100'));
        document.querySelectorAll(`.nav-${pageId.replace('-section', '')}`).forEach(l => l.classList.add('active', 'bg-gray-100'));
        const heroBanner = document.getElementById('hero-banner-container');
        heroBanner.style.display = pageId === 'home-section' ? 'block' : 'none';
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const pageId = `${link.classList[1].replace('nav-', '')}-section`;
            showPage(pageId);
            mobileMenu.classList.remove('active');
        });
    });
    
    // --- SEARCH ---
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const filtered = localGenerators.filter(g => 
            g.brand.toLowerCase().includes(searchTerm) || 
            g.model.toLowerCase().includes(searchTerm) ||
            g.description.toLowerCase().includes(searchTerm)
        );
        renderGenerators(filtered);
        document.getElementById('search-results').classList.toggle('hidden', !searchTerm);
        document.getElementById('results-count').textContent = filtered.length;
    });

    // --- ADMIN LOGIN ---
    const adminModal = document.getElementById('admin-login-modal');
    document.getElementById('hidden-login-btn').addEventListener('click', () => adminModal.classList.add('active'));
    document.getElementById('admin-login-form').addEventListener('submit', e => {
        e.preventDefault();
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            adminModal.classList.remove('active');
            document.querySelectorAll('.nav-admin').forEach(l => l.classList.remove('hidden'));
            showPage('admin-section');
        } else {
            document.getElementById('login-error').textContent = 'Invalid credentials.';
            document.getElementById('login-error').classList.remove('hidden');
        }
    });
    document.querySelector('.logout-btn').addEventListener('click', () => {
        document.querySelectorAll('.nav-admin').forEach(l => l.classList.add('hidden'));
        showPage('home-section');
    });

    // --- SLIDER ---
    let currentSlide = 0;
    let slideInterval;
    const heroBanner = document.querySelector('.hero-banner');
    const slideControls = document.getElementById('slide-controls');

    function updateSlide() {
        if (localHeroSlides.length > 0) {
            heroBanner.style.backgroundImage = `url('${localHeroSlides[currentSlide].url}')`;
            document.querySelectorAll('.slide-indicator').forEach((ind, i) => ind.classList.toggle('active', i === currentSlide));
        }
    }
    function startSlider() {
        if(slideInterval) clearInterval(slideInterval);
        if (localHeroSlides.length === 0) {
            heroBanner.style.backgroundImage = 'none';
            slideControls.innerHTML = '';
            return;
        }
        slideControls.innerHTML = localHeroSlides.map((_, i) => `<div class="slide-indicator" data-index="${i}"></div>`).join('');
        updateSlide();
        slideInterval = setInterval(() => { currentSlide = (currentSlide + 1) % localHeroSlides.length; updateSlide(); }, 5000);
        slideControls.addEventListener('click', e => {
            if(e.target.dataset.index) {
                currentSlide = parseInt(e.target.dataset.index);
                updateSlide();
                startSlider(); // reset interval
            }
        });
    }

    // --- RENDERING FUNCTIONS ---
    function renderHeroSlides() {
        const list = document.getElementById('slides-list');
        list.innerHTML = localHeroSlides.length ? localHeroSlides.map((slide) => `
            <div class="flex items-center justify-between bg-gray-100 p-2 rounded-lg" data-id="${slide.id}">
                <img src="${slide.url}" class="w-12 h-12 object-cover rounded-md mr-3">
                <span class="text-gray-700 truncate text-sm flex-1">${slide.url}</span>
                <button class="delete-slide text-red-500 hover:text-red-700 ml-4 p-2"><i class="fas fa-trash"></i></button>
            </div>`).join('') : `<p class="text-gray-500 text-center">No slides found.</p>`;
    }
    function renderAdminGeneratorsList() {
        const list = document.getElementById('generators-list');
        list.innerHTML = localGenerators.length ? localGenerators.map(g => `
            <div class="flex items-center justify-between bg-gray-100 p-2 rounded-lg" data-id="${g.id}">
                <img src="${g.image}" class="w-12 h-12 object-cover rounded-md mr-3">
                <div class="flex-1 overflow-hidden">
                    <h4 class="font-medium truncate">${g.brand} ${g.model}</h4>
                    <p class="text-sm text-gray-600">${g.kva}kVA</p>
                </div>
                <button class="delete-generator text-red-500 hover:text-red-700 ml-4 p-2"><i class="fas fa-trash"></i></button>
            </div>`).join('') : `<p class="text-gray-500 text-center">No generators found.</p>`;
    }
    function renderGenerators(gens = localGenerators) {
        const container = document.getElementById('generators-container');
        container.innerHTML = gens.length ? gens.map(g => `
            <div class="generator-card bg-white rounded-lg overflow-hidden">
                <div class="h-56 bg-gray-200"><img src="${g.image}" alt="${g.brand} ${g.model}" class="h-full w-full object-cover"></div>
                <div class="p-6">
                    <p class="text-sm font-semibold" style="color: var(--primary-color);">${g.brand}</p>
                    <h3 class="text-xl font-bold text-gray-800 mt-1">${g.model} - ${g.kva}kVA</h3>
                    <p class="text-gray-600 mt-2 mb-4 h-20 overflow-hidden">${g.description}</p>
                    <div class="mt-4 grid grid-cols-2 gap-3">
                        <button class="whatsapp-btn w-full btn-secondary py-2 px-4 rounded-md font-semibold flex items-center justify-center text-sm"><i class="fab fa-whatsapp mr-2"></i> WhatsApp</button>
                        <button class="contact-btn w-full btn-primary py-2 px-4 rounded-md font-semibold text-sm">Contact</button>
                    </div>
                </div>
            </div>`).join('') : `<p class="text-gray-500 text-center col-span-full">No generators found.</p>`;
    }

    // --- ADMIN ACTIONS (Now interacts with Firebase) ---
    document.getElementById('add-slide-btn').addEventListener('click', () => {
        const input = document.getElementById('slide-image-url');
        const url = input.value.trim();
        if (url) {
            slidesCollection.add({ url: url, createdAt: firebase.firestore.FieldValue.serverTimestamp() })
                .then(() => { input.value = ''; })
                .catch(err => console.error("Error adding slide: ", err));
        }
    });

    document.getElementById('generator-form').addEventListener('submit', e => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const newGenerator = {
            brand: formData.get('brand'),
            model: formData.get('model'),
            kva: parseInt(formData.get('kva')),
            image: formData.get('image'),
            description: formData.get('description'),
            features: formData.get('features').split(',').map(f => f.trim()),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        generatorsCollection.add(newGenerator)
            .then(() => { form.reset(); })
            .catch(err => console.error("Error adding generator: ", err));
    });

    document.querySelector('.cancel-btn').addEventListener('click', () => document.getElementById('generator-form').reset());

    // --- MODALS (Contact & Confirmation) ---
    const contactModal = document.getElementById('contact-modal');
    document.getElementById('contact-number').textContent = BUSINESS_NUMBER;
    document.getElementById('footer-contact-number').textContent = BUSINESS_NUMBER;
    document.getElementById('call-now-link').href = `tel:${BUSINESS_NUMBER}`;
    document.getElementById('close-contact-modal').addEventListener('click', () => contactModal.classList.remove('active'));
    document.getElementById('copy-number').addEventListener('click', () => {
        navigator.clipboard.writeText(BUSINESS_NUMBER).then(() => {
            const btn = document.getElementById('copy-number');
            btn.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
            setTimeout(() => { btn.innerHTML = '<i class="fas fa-copy mr-2"></i> Copy'; }, 2000);
        });
    });
    
    const confirmationModal = document.getElementById('confirmation-modal');
    let onConfirmDelete = null;
    document.getElementById('confirm-delete-btn').addEventListener('click', () => {
        if (onConfirmDelete) onConfirmDelete();
        confirmationModal.classList.remove('active');
    });
    document.getElementById('cancel-delete-btn').addEventListener('click', () => confirmationModal.classList.remove('active'));

    // --- EVENT DELEGATION (with Firebase actions) ---
    document.addEventListener('click', e => {
        if (e.target.closest('.explore-btn')) showPage('generators-section');
        if (e.target.closest('.contact-btn')) contactModal.classList.add('active');
        
        const whatsappBtn = e.target.closest('.whatsapp-btn');
        if (whatsappBtn) {
            const card = whatsappBtn.closest('.generator-card');
            const brand = card.querySelector('p').textContent;
            const modelAndKva = card.querySelector('h3').textContent;
            const message = `Hi, I'm interested in the ${brand} ${modelAndKva} generator. Could you provide more information?`;
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/${BUSINESS_NUMBER.replace(/\D/g, '')}?text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
        }

        if (e.target.closest('.modal') && !e.target.closest('.modal-content')) e.target.closest('.modal').classList.remove('active');
        
        const deleteGenBtn = e.target.closest('.delete-generator');
        if (deleteGenBtn) {
            const id = deleteGenBtn.closest('[data-id]').getAttribute('data-id');
            onConfirmDelete = () => {
                generatorsCollection.doc(id).delete().catch(err => console.error("Error deleting generator: ", err));
            };
            confirmationModal.classList.add('active');
        }
        
        const deleteSlideBtn = e.target.closest('.delete-slide');
        if (deleteSlideBtn) {
            const id = deleteSlideBtn.closest('[data-id]').getAttribute('data-id');
            onConfirmDelete = () => {
                slidesCollection.doc(id).delete().catch(err => console.error("Error deleting slide: ", err));
            };
            confirmationModal.classList.add('active');
        }
    });

    // --- INITIALIZE ---
    showPage('home-section');
});
