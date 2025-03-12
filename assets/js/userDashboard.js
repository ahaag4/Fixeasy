import { auth, db } from "./firebase.js";
import {
  doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

let userId;
let latestServiceId;
let subscriptionPlan;
let remainingRequests;

// ✅ Authenticate User
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("You are not signed in. Redirecting...");
    window.location.href = "signin.html";
    return;
  }

  userId = user.uid;
  await loadUserProfile();
  await checkSubscription();
  await loadUserServices();
});

// ✅ Section 1: Load Profile
async function loadUserProfile() {
  const userDoc = await getDoc(doc(db, "users", userId));

  if (userDoc.exists()) {
    const userData = userDoc.data();
    document.getElementById("username").value = userData.username;
    document.getElementById("phone").value = userData.phone;
    document.getElementById("address").value = userData.address;
  }
}

// ✅ Section 2: Check Subscription
async function checkSubscription() {
  const subDoc = await getDoc(doc(db, "subscriptions", userId));

  if (subDoc.exists()) {
    const data = subDoc.data();
    subscriptionPlan = data.plan;
    remainingRequests = data.remainingRequests;

    document.getElementById("plan").innerText = subscriptionPlan;
    document.getElementById("remaining-requests").innerText = remainingRequests;
  } else {
    await setDoc(doc(db, "subscriptions", userId), {
      plan: "Free",
      remainingRequests: 5
    });
    location.reload();
  }
}

// ✅ Section 3: Request Service
document.getElementById("request-service-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (remainingRequests <= 0 && subscriptionPlan === "Free") {
    alert("Request limit reached. Upgrade to Gold.");
    return;
  }

  const service = document.getElementById("service").value;
  const serviceProvider = await autoAssignServiceProvider();

  if (!serviceProvider) {
    alert("No Service Provider Available.");
    return;
  }

  const docRef = await addDoc(collection(db, "services"), {
    serviceName: service,
    requestedBy: userId,
    assignedTo: serviceProvider,
    status: "Assigned"
  });

  latestServiceId = docRef.id;
  await updateDoc(doc(db, "subscriptions", userId), {
    remainingRequests: remainingRequests - 1
  });

  alert("Service Requested Successfully!");
  location.reload();
});

// ✅ Section 4: Auto Assign Service Provider
async function autoAssignServiceProvider() {
  const q = query(collection(db, "users"), where("role", "==", "service_provider"));
  const providers = await getDocs(q);

  if (!providers.empty) {
    return providers.docs[0].id;
  }
  return null;
}

// ✅ Section 5: Load Services
async function loadUserServices() {
  const q = query(collection(db, "services"), where("requestedBy", "==", userId));
  const querySnapshot = await getDocs(q);

  const container = document.getElementById("assigned-service");
  container.innerHTML = "";

  querySnapshot.forEach(async (docSnap) => {
    const data = docSnap.data();
    let providerProfile = "Not Assigned";

    if (data.assignedTo) {
      const providerDoc = await getDoc(doc(db, "users", data.assignedTo));
      providerProfile = providerDoc.data().username;
    }

    container.innerHTML += `
      <div>
        <p><b>Service:</b> ${data.serviceName}</p>
        <p><b>Status:</b> ${data.status}</p>
        <p><b>Service Provider:</b> ${providerProfile}</p>
        <button onclick="cancelService('${docSnap.id}')">Cancel Service</button>
      </div>
    `;

    if (data.status === "Completed") {
      document.getElementById("section-4").classList.remove("hidden");
      latestServiceId = docSnap.id;
    }
  });
}

// ✅ Section 6: Cancel Service
window.cancelService = async (serviceId) => {
  await updateDoc(doc(db, "services", serviceId), { status: "Cancelled" });
  alert("Service Cancelled!");
  location.reload();
};

// ✅ Section 7: Submit Feedback
document.getElementById("feedback-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const rating = document.getElementById("rating").value;
  const feedback = document.getElementById("feedback").value;

  await updateDoc(doc(db, "services", latestServiceId), {
    feedback, rating, status: "Closed"
  });

  alert("Feedback Submitted!");
  location.reload();
};

// ✅ Section 8: Upgrade to Gold
window.subscribeGold = async () => {
  await setDoc(doc(db, "subscriptions", userId), {
    plan: "Gold",
    remainingRequests: 35
  });

  alert("Gold Plan Activated.");
  location.reload();
};
                                                   
