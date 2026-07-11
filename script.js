let products = JSON.parse(localStorage.getItem('elgohary_products')) || defaultProducts;
let cart = [];
let isAdminLoggedIn = false;

// متغيرات لتتبع الصورة النشطة حالياً داخل الـ Lightbox للتحكم بالأسهم والزوم
let currentActiveProductId = null;
let currentActiveImgIndex = 0;

const myPhoneNumber = "201033553883"; // رقم الواتساب

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

// دالة تحويل ملف الصورة إلى صيغة Base64 لتخزينها بشكل دائم في الـ LocalStorage
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// دالة عرض المنتجات مع بناء المعرض المصغر لكل كاميرا
function displayProducts() {
    productsContainer.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        // تجهيز الصور المصغرة
        let galleryHtml = '';
        if(product.imgs && product.imgs.length > 0) {
            product.imgs.forEach((imgSrc, index) => {
                const initialOpacity = index === 0 ? 'style="opacity: 1;"' : '';
                galleryHtml += `<img src="${imgSrc}" class="gallery-thumb" ${initialOpacity} data-index="${index}" onclick="changeMainImg(this, '${product.id}')">`;
            });
        }

        card.innerHTML = `
            <img src="${product.imgs[0]}" alt="${product.name}" class="main-img" id="main-img-${product.id}" onclick="openZoom('${product.id}')">
            <div class="product-gallery">${galleryHtml}</div>
            <h3>${product.name}</h3>
            <p class="price">${product.price} $</p>
            <button onclick="addToCart('${product.name}', ${product.price})">إضافة إلى السلة</button>
            ${isAdminLoggedIn ? `<button class="delete-btn" onclick="deleteProduct(${product.id})">حذف المنتج 🗑️</button>` : ''}
        `;
        productsContainer.appendChild(card);
    });
}

// دالة التبديل بين الصور وتحديد الصورة النشطة
function changeMainImg(thumb, productId) {
    const mainImg = document.getElementById(`main-img-${productId}`);
    if (mainImg) {
        mainImg.src = thumb.src;
    }
    
    const card = thumb.closest('.product-card');
    const thumbs = card.querySelectorAll('.gallery-thumb');
    thumbs.forEach(t => t.style.opacity = '0.7');
    thumb.style.opacity = '1';
}

// دالة فتح زووم وتكبير الصورة شاشة كاملة
function openZoom(productId) {
    const product = products.find(p => p.id == productId || p.id === parseInt(productId));
    if (!product) return;

    currentActiveProductId = product.id;
    
    const mainImgSrc = document.getElementById(`main-img-${productId}`).src;
    currentActiveImgIndex = product.imgs.indexOf(mainImgSrc);
    if (currentActiveImgIndex === -1) currentActiveImgIndex = 0;

    lightboxImg.classList.remove('zoomed');
    lightboxImg.src = product.imgs[currentActiveImgIndex];
    lightbox.classList.remove('hidden');
}

// دالة غلق الزووم
function closeZoom() {
    lightbox.classList.add('hidden');
    lightboxImg.classList.remove('zoomed');
    currentActiveProductId = null;
}

// ميزة الضغط مرتين على الصورة لتكبيرها وتصغيرها (Double Click Zoom)
lightboxImg.addEventListener('dblclick', (e) => {
    e.stopPropagation(); // يمنع انغلاق الـ Lightbox عند الضغط المزدوج
    lightboxImg.classList.toggle('zoomed');
});

// استماع لضغط الأسهم في الكيبورد للتبديل بين الصور
document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('hidden') || !currentActiveProductId) return;

    const product = products.find(p => p.id === currentActiveProductId);
    if (!product || !product.imgs || product.imgs.length <= 1) return;

    lightboxImg.classList.remove('zoomed'); // إلغاء الزوم تلقائياً عند الانتقال لصورة أخرى

    if (e.key === 'ArrowRight') {
        currentActiveImgIndex++;
        if (currentActiveImgIndex >= product.imgs.length) {
            currentActiveImgIndex = 0;
        }
        lightboxImg.src = product.imgs[currentActiveImgIndex];
    } 
    else if (e.key === 'ArrowLeft') {
        currentActiveImgIndex--;
        if (currentActiveImgIndex < 0) {
            currentActiveImgIndex = product.imgs.length - 1;
        }
        lightboxImg.src = product.imgs[currentActiveImgIndex];
    }
    else if (e.key === 'Escape') {
        closeZoom();
    }
});

// لوحة التحكم وتأكيد الإدارة
adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (adminPasswordInput.value === "Amino") {
        alert("أهلاً بك يا الجوهري! تم تفعيل لوحة الإدارة وزرار الحذف.");
        isAdminLoggedIn = true;
        adminLoginForm.classList.add('hidden');
        addProductForm.classList.remove('hidden');
        displayProducts();
    } else {
        alert("كلمة المرور خاطئة!");
    }
});

// إظهار عدد الصور المختارة
fileInput.addEventListener('change', function() {
    if (this.files && this.files.length > 0) {
        fileNamePreview.innerText = `عدد الصور المختارة: ${this.files.length}`;
    }
});

// رفع الصور وحفظهم
addProductForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('prod-name').value;
    const price = parseInt(document.getElementById('prod-price').value);
    const files = fileInput.files;
    
    let imgUrls = [];
    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            try {
                const base64String = await fileToBase64(files[i]);
                imgUrls.push(base64String);
            } catch (error) {
                console.error("خطأ في التحويل: ", error);
            }
        }
    } else {
        imgUrls.push("https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500");
    }

    products.push({ id: Date.now(), name, price, imgs: imgUrls });
    localStorage.setItem('elgohary_products', JSON.stringify(products));
    
    displayProducts();
    alert(`تمت إضافة ${name} بنجاح!`);
    addProductForm.reset();
    fileNamePreview.innerText = "لم يتم اختيار صور بعد";
});

function deleteProduct(id) {
    if(confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
        products = products.filter(p => p.id !== id);
        localStorage.setItem('elgohary_products', JSON.stringify(products));
        displayProducts();
    }
}

function addToCart(name, price) {
    cart.push({ name, price });
    updateCartUI();
}

function updateCartUI() {
    cartCount.innerText = cart.length;
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-msg" style="text-align:center; color:#666;">السلة فارغة حالياً.</p>';
        totalPrice.innerText = '0';
        return;
    }
    
    let total = 0;
    cart.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.name}</span> <span>${item.price} $</span>`;
        cartItems.appendChild(li);
        total += item.price;
    });
    totalPrice.innerText = total;
}

checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) {
        alert('السلة فارغة!');
        return;
    }

    let itemsList = "";
    let total = 0;
    cart.forEach((item, index) => {
        itemsList += `${index + 1}- ${item.name} (${item.price} $)\n`;
        total += item.price;
    });

    let message = `مرحباً El Gohary Stores، أريد شراء الكاميرات التالية:\n\n`;
    message += `${itemsList}\n`;
    message += `المجموع الإجمالي: ${total} $\n`;
    message += `يرجى تأكيد الطلب.`;

    window.open(`https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
    cart = [];
    updateCartUI();
});

if (sellForm) {
    sellForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const clientName = document.getElementById('client-name').value;
        const clientPhone = document.getElementById('client-phone').value;
        const cameraModel = document.getElementById('camera-model').value;
        const cameraStatus = document.getElementById('camera-status').options[document.getElementById('camera-status').selectedIndex].text;
        const expectedPrice = document.getElementById('expected-price').value;

        let sellMessage = `مرحباً El Gohary Stores، أريد عرض كاميرتي للبيع ليكم:\n\n`;
        sellMessage += `👤 الاسم: ${clientName}\n`;
        sellMessage += `📞 رقم التواصل: ${clientPhone}\n`;
        sellMessage += `📷 الموديل: ${cameraModel}\n`;
        sellMessage += `✨ الحالة: ${cameraStatus}\n`;
        sellMessage += `💰 السعر المطلوب: ${expectedPrice} $\n`;

        window.open(`https://wa.me/${myPhoneNumber}?text=${encodeURIComponent(sellMessage)}`, '_blank');
        sellForm.reset();
    });
}

displayProducts();
