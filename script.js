/* ==========================================================
   TUITION TEACHER WEBSITE
   GitHub Pages + Firebase Firestore Reviews

   IMPORTANT:
   Replace firebaseConfig values with your own Firebase
   Web App configuration.
========================================================== */

import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot
} from
  "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

/* ==========================================================
   FIREBASE CONFIGURATION
========================================================== */

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_FIREBASE_APP_ID"
};

/* ==========================================================
   CONFIG CHECK
========================================================== */

const firebaseConfigured =
  !firebaseConfig.apiKey.startsWith("YOUR_") &&
  !firebaseConfig.projectId.startsWith("YOUR_") &&
  !firebaseConfig.appId.startsWith("YOUR_");

let db = null;

if (firebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

/* ==========================================================
   DOM ELEMENTS
========================================================== */

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

const reviewForm = document.getElementById("reviewForm");
const reviewName = document.getElementById("reviewName");
const reviewComment = document.getElementById("reviewComment");
const ratingValue = document.getElementById("ratingValue");
const starButtons = document.querySelectorAll("#starInput button");
const ratingHint = document.getElementById("ratingHint");
const characterCount = document.getElementById("characterCount");

const reviewList = document.getElementById("reviewList");
const emptyReviews = document.getElementById("emptyReviews");

const averageRating = document.getElementById("averageRating");
const averageStars = document.getElementById("averageStars");
const reviewCount = document.getElementById("reviewCount");

const submitReview = document.getElementById("submitReview");
const toast = document.getElementById("toast");

const currentYear = document.getElementById("currentYear");

currentYear.textContent = new Date().getFullYear();

/* ==========================================================
   MOBILE NAVIGATION
========================================================== */

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "✕" : "☰";
});

document.querySelectorAll(".main-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";
  });
});

/* ==========================================================
   SCROLL REVEAL
========================================================== */

const revealElements = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.12
  }
);

revealElements.forEach((element) => {
  revealObserver.observe(element);
});

/* ==========================================================
   STAR RATING
========================================================== */

let selectedRating = 0;

function updateStarUI(rating) {
  starButtons.forEach((button) => {
    const value = Number(button.dataset.star);

    button.classList.toggle("active", value <= rating);
  });

  if (rating === 0) {
    ratingHint.textContent = "Select a rating.";
  } else {
    ratingHint.textContent =
      `${rating} out of 5 star${rating === 1 ? "" : "s"} selected.`;
  }
}

starButtons.forEach((button) => {
  button.addEventListener("mouseenter", () => {
    const hoverRating = Number(button.dataset.star);
    updateStarUI(hoverRating);
  });

  button.addEventListener("click", () => {
    selectedRating = Number(button.dataset.star);
    ratingValue.value = selectedRating;
    updateStarUI(selectedRating);
  });
});

document.getElementById("starInput").addEventListener("mouseleave", () => {
  updateStarUI(selectedRating);
});

/* ==========================================================
   CHARACTER COUNTER
========================================================== */

reviewComment.addEventListener("input", () => {
  characterCount.textContent = reviewComment.value.length;
});

/* ==========================================================
   TOAST
========================================================== */

let toastTimer;

function showToast(message) {
  clearTimeout(toastTimer);

  toast.textContent = message;
  toast.classList.add("show");

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

/* ==========================================================
   LOCAL FALLBACK
   Used only until Firebase is configured.
========================================================== */

const LOCAL_STORAGE_KEY = "tuitionTeacherReviews";

function getLocalReviews() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalReview(review) {
  const reviews = getLocalReviews();

  reviews.unshift(review);

  localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify(reviews.slice(0, 50))
  );
}

/* ==========================================================
   REVIEW HELPERS
========================================================== */

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function formatDate(dateValue) {
  let date;

  if (dateValue?.toDate) {
    date = dateValue.toDate();
  } else {
    date = new Date(dateValue);
  }

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getStars(rating) {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function getInitials(name) {
  const words = name.trim().split(/\s+/);

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (
    words[0][0] +
    words[words.length - 1][0]
  ).toUpperCase();
}

/* ==========================================================
   DISPLAY REVIEWS
========================================================== */

function displayReviews(reviews) {
  reviewList.innerHTML = "";

  if (!reviews.length) {
    reviewList.appendChild(emptyReviews);
    emptyReviews.style.display = "block";
    updateReviewStatistics([]);
    return;
  }

  emptyReviews.style.display = "none";

  reviews.forEach((review) => {
    const article = document.createElement("article");

    article.className = "review-item";

    const name = escapeHTML(review.name);
    const comment = escapeHTML(review.comment);
    const rating = Math.max(
      1,
      Math.min(5, Number(review.rating))
    );

    article.innerHTML = `
      <div class="review-top">
        <div class="review-author">
          <div class="author-avatar">
            ${escapeHTML(getInitials(review.name))}
          </div>

          <div>
            <strong>${name}</strong>
            <span class="review-date">
              ${formatDate(review.createdAt)}
            </span>
          </div>
        </div>

        <div class="review-stars" aria-label="${rating} out of 5 stars">
          ${getStars(rating)}
        </div>
      </div>

      <p class="review-comment">${comment}</p>
    `;

    reviewList.appendChild(article);
  });

  updateReviewStatistics(reviews);
}

/* ==========================================================
   REVIEW STATISTICS
========================================================== */

function updateReviewStatistics(reviews) {
  const count = reviews.length;

  reviewCount.textContent = count;

  if (count === 0) {
    averageRating.textContent = "0.0";
    averageStars.textContent = "☆☆☆☆☆";

    for (let star = 1; star <= 5; star++) {
      const fill = document.querySelector(
        `[data-rating-bar="${star}"]`
      );

      const countElement = document.querySelector(
        `[data-rating-count="${star}"]`
      );

      fill.style.width = "0%";
      countElement.textContent = "0";
    }

    return;
  }

  const total = reviews.reduce(
    (sum, review) => sum + Number(review.rating),
    0
  );

  const average = total / count;

  averageRating.textContent = average.toFixed(1);

  const rounded = Math.round(average);

  averageStars.textContent =
    getStars(rounded);

  for (let star = 1; star <= 5; star++) {
    const starCount = reviews.filter(
      (review) => Number(review.rating) === star
    ).length;

    const percentage =
      (starCount / count) * 100;

    const fill = document.querySelector(
      `[data-rating-bar="${star}"]`
    );

    const countElement = document.querySelector(
      `[data-rating-count="${star}"]`
    );

    fill.style.width = `${percentage}%`;
    countElement.textContent = starCount;
  }
}

/* ==========================================================
   LOAD REVIEWS FROM FIREBASE
========================================================== */

function startFirebaseReviews() {
  const reviewsQuery = query(
    collection(db, "reviews"),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  onSnapshot(
    reviewsQuery,
    (snapshot) => {
      const reviews = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      displayReviews(reviews);
    },
    (error) => {
      console.error("Firestore error:", error);

      showToast(
        "Reviews could not be loaded. Please check your Firebase setup."
      );
    }
  );
}

/* ==========================================================
   LOAD LOCAL REVIEWS
========================================================== */

function startLocalReviews() {
  displayReviews(getLocalReviews());

  showToast(
    "Demo mode: connect Firebase to make reviews shared for everyone."
  );
}

/* ==========================================================
   SUBMIT REVIEW
========================================================== */

reviewForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = reviewName.value.trim();
  const comment = reviewComment.value.trim();
  const rating = Number(ratingValue.value);

  if (name.length < 2) {
    showToast("Please enter your name.");
    reviewName.focus();
    return;
  }

  if (rating < 1 || rating > 5) {
    showToast("Please select a star rating.");
    return;
  }

  if (comment.length < 5) {
    showToast("Please write a slightly longer review.");
    reviewComment.focus();
    return;
  }

  submitReview.disabled = true;
  submitReview.textContent = "Publishing...";

  const newReview = {
    name,
    rating,
    comment,
    createdAt: Date.now()
  };

  try {
    if (firebaseConfigured) {
      await addDoc(
        collection(db, "reviews"),
        newReview
      );

      showToast("Thank you! Your review has been published.");
    } else {
      saveLocalReview(newReview);

      displayReviews(getLocalReviews());

      showToast(
        "Review saved on this device. Connect Firebase for shared reviews."
      );
    }

    reviewForm.reset();

    selectedRating = 0;
    ratingValue.value = "0";

    updateStarUI(0);

    characterCount.textContent = "0";
  } catch (error) {
    console.error("Review submission error:", error);

    showToast(
      "The review could not be submitted. Please try again."
    );
  } finally {
    submitReview.disabled = false;
    submitReview.textContent = "Publish Review";
  }
});

/* ==========================================================
   START REVIEW SYSTEM
========================================================== */

/* =========================
   ANIMATED COUNTERS
========================= */

const counters = document.querySelectorAll(".quick-info strong");

const counterObserver = new IntersectionObserver(
  (entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const counter = entry.target;

      // Get number from text such as "100+"
      const originalText = counter.textContent;
      const target = parseInt(originalText.replace(/\D/g, ""), 10);
      const suffix = originalText.includes("+") ? "+" : "";

      if (Number.isNaN(target)) return;

      let current = 0;
      const duration = 1200;
      const startTime = performance.now();

      function animateCounter(currentTime) {
        const progress = Math.min(
          (currentTime - startTime) / duration,
          1
        );

        // Smooth easing
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        current = Math.floor(target * easedProgress);

        counter.textContent = current + suffix;

        if (progress < 1) {
          requestAnimationFrame(animateCounter);
        } else {
          counter.textContent = target + suffix;
        }
      }

      requestAnimationFrame(animateCounter);

      observer.unobserve(counter);
    });
  },
  {
    threshold: 0.7
  }
);

counters.forEach((counter) => {
  counterObserver.observe(counter);
});