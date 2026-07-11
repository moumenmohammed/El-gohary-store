// --- 1. التهيئة وإدارة التخزين المحلي (Local Storage) ---
let products = [];
try {
    products = JSON.parse(localStorage.getItem('elgohary_products')) || [];
} catch (e) {
    console.error("خطأ في قراءة المنتجات من localStorage:", e);
    products = [];
}

let cart = [];
try {
    cart = JSON.parse(localStorage.getItem('elgohary_cart')) || [];
} catch (e) {
    console.error("خطأ في قراءة السلة من localStorage:", e);
    cart = [];
}

let isAdminLoggedIn = false;
let currentActiveProductId = null;
let currentActiveImgIndex = 0;

const myPhoneNumber = "201033553883";
const DEFAULT_IMG = "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500";

// --- 2. جلب عناصر واجهة المستخدم (DOM Elements) ---
const productsContainer = document.getElementById('products-container');
const cartCount = document.getElementById('cart-count');
const cartItems = document.getElementById('cart-items');
const totalPrice = document.getElementById('total-price');
const checkoutBtn = document.getElementById('checkout-btn');

const adminLoginForm = document.getElementById('admin-login-form');
const adminPasswordInput = document.getElementById('admin-password');
const addProductForm = document.getElementById('add-product-form');
const fileInput = document.getElementById('prod-img-file');
const fileNamePreview = document.getElementById('file-name-preview');
const sellForm = document.getElementById('sell-form');

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');

// --- 3. الدوال المساعدة (Utility Functions) ---
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// دالة آمنة لجلب رابط الصورة الأولى للمنتج منعاً لظهور undefined 404
function getProductMainImg(product) {
    if (product && product.imgs && product.imgs.length > 0 && product.imgs[0]) {
        return product.imgs[0];
    }
    return DEFAULT_IMG;
}

// --- 4. إدارة عرض المنتجات (Products Rendering) ---
function displayProducts() {
    if (!productsContainer) return;
    productsContainer.innerHTML = '';

    if (products.length === 0) {
        productsContainer.innerHTML = '<p class="empty-msg" style="grid-column: 1/-1; text-align:center; color:#666;">لا توجد منتجات معروضة حالياً.</p>';
        return;
    }

    products.forEach(product => {
        if (!product || !product.id || !product.name) return;

        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-id', product.id);
        
        let galleryHtml = '';
        if (product.imgs && Array.isArray(product.imgs)) {
            product.imgs.forEach((imgSrc, index) => {
                if (!imgSrc) return;
                const initialOpacity = index === 0 ? 'style="opacity: 1;"' : '';
                // 🔽 إضافة onerror للصور المصغرة لحمايتها من الكسر
                galleryHtml += `<img src="${imgSrc}" class="gallery-thumb" ${initialOpacity} data-index="${index}" onclick="changeMainImg(this, '${product.id}')" onerror="this.onerror=null; this.src='${DEFAULT_IMG}';" alt="صورة مصغرة">`;
            });
        }

        const mainImgSrc = getProductMainImg(product);

        card.innerHTML = `
            <img src="${mainImgSrc}" alt="${product.name}" class="main-img" id="main-img-${product.id}" onclick="openZoom('${product.id}')" onerror="this.onerror=null; this.src='${DEFAULT_IMG}';">
            <div class="product-gallery">${galleryHtml}</div>
            <h3>${product.name}</h3>
            <p class="price">EGP{Number(product.price || 0).toLocaleString()} $</p>
            <button class="add-to-cart-btn">إضافة إلى السلة</button>
            ${isAdminLoggedIn ? `<button class="delete-btn">حذف المنتج 🗑️</button>` : ''}
        `;

        card.querySelector('.add-to-cart-btn').addEventListener('click', () => {
            addToCart(product.id, product.name, product.price);
        });

        if (isAdminLoggedIn) {
            card.querySelector('.delete-btn').addEventListener('click', () => {
                deleteProduct(product.id);
            });
        }

        productsContainer.appendChild(card);
    });
}

function changeMainImg(thumb, productId) {
    const mainImg = document.getElementById(`main-img-${productId}`);
    if (mainImg && thumb) {
        mainImg.src = thumb.src;
    }
    
    const card = thumb.closest('.product-card');
    if (card) {
        const thumbs = card.querySelectorAll('.gallery-thumb');
        thumbs.forEach(t => t.style.opacity = '0.7');
        thumb.style.opacity = '1';
    }
}

// --- 5. نظام الـ Lightbox وعرض الصور الفول سكرين ---
function openZoom(productId) {
    const targetId = isNaN(productId) ? productId : Number(productId);
    const product = products.find(p => p.id === targetId);
    if (!product || !product.imgs || product.imgs.length === 0) return;

    currentActiveProductId = product.id;
    
    const mainImgElem = document.getElementById(`main-img-${productId}`);
    const mainImgSrc = mainImgElem ? mainImgElem.src : product.imgs[0];
    
    currentActiveImgIndex = product.imgs.indexOf(mainImgSrc);
    if (currentActiveImgIndex === -1) currentActiveImgIndex = 0;

    if (lightboxImg && lightbox) {
        lightboxImg.classList.remove('zoomed');
        lightboxImg.src = product.imgs[currentActiveImgIndex];
        lightbox.classList.remove('hidden');
    }
}

function closeZoom() {
    if (lightbox && lightboxImg) {
        lightbox.classList.add('hidden');
        lightboxImg.classList.remove('zoomed');
    }
    currentActiveProductId = null;
}

function navigateLightbox(direction) {
    if (!currentActiveProductId) return;
    const targetId = isNaN(currentActiveProductId) ? currentActiveProductId : Number(currentActiveProductId);
    const product = products.find(p => p.id === targetId);
    if (!product || !product.imgs || product.imgs.length <= 1) return;

    if (lightboxImg) {
        lightboxImg.classList.remove('zoomed');
        if (direction === 'next') {
            currentActiveImgIndex = (currentActiveImgIndex + 1) % product.imgs.length;
        } else if (direction === 'prev') {
            currentActiveImgIndex = (currentActiveImgIndex - 1 + product.imgs.length) % product.imgs.length;
        }
        lightboxImg.src = product.imgs[currentActiveImgIndex];
    }
}

if (lightboxImg) {
    lightboxImg.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        lightboxImg.classList.toggle('zoomed');
    });
    // حماية صورة الـ Lightbox أيضاً من الكسر
    lightboxImg.addEventListener('error', function() {
        this.src = DEFAULT_IMG;
    });
}

document.addEventListener('keydown', (e) => {
    if (!lightbox || lightbox.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight') navigateLightbox('next');
    if (e.key === 'ArrowLeft') navigateLightbox('prev');
    if (e.key === 'Escape') closeZoom();
});

const prevBtn = document.getElementById('lightbox-prev');
const nextBtn = document.getElementById('lightbox-next');
const closeBtn = document.getElementById('lightbox-close');

if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox('prev'); });
if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); navigateLightbox('next'); });
if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeZoom(); });
if (lightbox) lightbox.addEventListener('click', () => closeZoom());

// --- 6. إدارة سلة المشتريات (Cart Management) ---
function addToCart(id, name, price) {
    const parsedPrice = parseFloat(price) || 0;
    cart.push({ id, name, price: parsedPrice });
    updateCartUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

function updateCartUI() {
    try {
        localStorage.setItem('elgohary_cart', JSON.stringify(cart));
    } catch (e) {
        console.error("فشل حفظ السلة في localStorage:", e);
    }

    if (cartCount) cartCount.innerText = cart.length;
    if (!cartItems || !totalPrice) return;

    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-msg" style="text-align:center; color:#666;">السلة فارغة حالياً.</p>';
        totalPrice.innerText = '0';
        return;
    }
    
    let total = 0;
    cart.forEach((item, index) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.marginBottom = '8px';

        li.innerHTML = `
            <span>${item.name} - ${Number(item.price).toLocaleString()} $</span>
            <button class="remove-item-btn" style="background:none; border:none; color:red; cursor:pointer;">❌</button>
        `;

        li.querySelector('.remove-item-btn').addEventListener('click', () => {
            removeFromCart(index);
        });

        cartItems.appendChild(li);
        total += item.price;
    });
    totalPrice.innerText = total.toLocaleString();
}

if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('السلة فارغة!');
            return;
        }

        let itemsList = "";
        let total = 0;
        cart.forEach((item, index) => {
            itemsList += `${index + 1}- ${item.name} (${Number(item.price).toLocaleString()} $)\n`;
            total += item.price;
        });

        let message = `مرحباً El Gohary Stores، أريد شراء الكاميرات التالية:\n\n`;
        message += `${itemsList}\n`;
        message += `المجموع الإجمالي: ${total.toLocaleString()} $\n`;
        message += `يرجى تأكيد الطلب.`;

        window.open(`https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
        cart = [];
        updateCartUI();
    });
}

// --- 7. لوحة التحكم وإدارة المنتجات (Admin Actions) ---
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!adminPasswordInput) return;

        const password = adminPasswordInput.value.trim();
        adminPasswordInput.value = "";

        if (password === "Amino") {
            isAdminLoggedIn = true;
            adminLoginForm.classList.add("hidden");
            if (addProductForm) addProductForm.classList.remove("hidden");
            displayProducts();
            alert("أهلاً بك يا الجوهري 👋");
        } else {
            alert("كلمة المرور خاطئة!");
        }
    });
}

if (fileInput) {
    fileInput.addEventListener('change', function() {
        if (fileNamePreview && this.files) {
            fileNamePreview.innerText = this.files.length > 0 ? `عدد الصور المختارة: ${this.files.length}` : "لم يتم اختيار صور بعد";
        }
    });
}

if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nameElem = document.getElementById('prod-name');
        const priceElem = document.getElementById('prod-price');
        
        if (!nameElem || !priceElem || !fileInput) return;

        const name = nameElem.value.trim();
        const price = parseFloat(priceElem.value) || 0;
        const files = fileInput.files;

        if (!name || price <= 0) {
            alert("يرجى إدخال اسم منتج صحيح وسعر أكبر من صفر.");
            return;
        }
        
        let imgUrls = [];
        if (files && files.length > 0) {
            let currentStorageSize = encodeURIComponent(JSON.stringify(localStorage)).length;
            if (currentStorageSize > 4 * 1024 * 1024) { 
                alert("تنبيه: مساحة التخزين ممتلئة تقريباً! يرجى رفع صور بحجم أصغر.");
            }

            for (let i = 0; i < files.length; i++) {
                try {
                    const base64String = await fileToBase64(files[i]);
                    imgUrls.push(base64String);
                } catch (error) {
                    console.error("خطأ في معالجة وتحويل الصورة: ", error);
                }
            }
        }

        if (imgUrls.length === 0) {
            imgUrls.push(DEFAULT_IMG);
        }

        const newProduct = { id: Date.now(), name, price, imgs: imgUrls };
        products.push(newProduct);
        
        try {
            localStorage.setItem('elgohary_products', JSON.stringify(products));
        } catch(err) {
            alert("فشل حفظ المنتج! يبدو أن حجم الصور كبير جداً وتجاوز مساحة المتصفح المسموحة (5MB).");
            products.pop();
            return;
        }
        
        displayProducts();
        alert(`تمت إضافة ${name} بنجاح!`);
        addProductForm.reset();
        if (fileNamePreview) fileNamePreview.innerText = "لم يتم اختيار صور بعد";
    });
}

function deleteProduct(id) {
    if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
        const targetId = isNaN(id) ? id : Number(id);
        
        products = products.filter(p => p.id !== targetId);
        localStorage.setItem('elgohary_products', JSON.stringify(products));
        
        cart = cart.filter(item => item.id !== targetId);
        
        displayProducts();
        updateCartUI();
    }
}

// --- 8. نموذج استمارة بيع كاميرا للمتجر ---
if (sellForm) {
    sellForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const clientNameElem = document.getElementById('client-name');
        const clientPhoneElem = document.getElementById('client-phone');
        const cameraModelElem = document.getElementById('camera-model');
        const cameraStatusElem = document.getElementById('camera-status');
        const expectedPriceElem = document.getElementById('expected-price');

        if (!clientNameElem || !clientPhoneElem || !cameraModelElem || !cameraStatusElem || !expectedPriceElem) return;

        const clientName = clientNameElem.value.trim();
        const clientPhone = clientPhoneElem.value.trim();
        const cameraModel = cameraModelElem.value.trim();
        const cameraStatus = cameraStatusElem.options[cameraStatusElem.selectedIndex].text;
        const expectedPrice = expectedPriceElem.value.trim();

        let sellMessage = `مرحباً El Gohary Stores، أريد عرض كاميرتي للبيع ليكم:\n\n`;
        sellMessage += `👤 الاسم: ${clientName}\n`;
        sellMessage += `📞 رقم التواصل: ${clientPhone}\n`;
        sellMessage += `📷 الموديل: ${cameraModel}\n`;
        sellMessage += `✨ الحالة: ${cameraStatus}\n`;
        sellMessage += `💰 السعر المطلوب: ${Number(expectedPrice || 0).toLocaleString()} $\n`;

        window.open(`https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(sellMessage)}`, '_blank');
        sellForm.reset();
    });
}

// --- 9. التشغيل الفوري عند إقلاع الصفحة ---
document.addEventListener('DOMContentLoaded', () => {
    displayProducts();
    updateCartUI();
});
