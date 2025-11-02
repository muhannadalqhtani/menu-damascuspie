import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
// import "./Admin.css"; // علّقها لو ما عندك الملف

export default function Admin() {
  // ===== أقسام =====
  const [cats, setCats] = useState([]);
  const [catId, setCatId] = useState("");
  const [catTitle, setCatTitle] = useState("");
  const [catOrder, setCatOrder] = useState("");
  const [catBannerTop, setCatBannerTop] = useState("");
  const [catBannerAfter, setCatBannerAfter] = useState("");

  // ===== منتجات =====
  const [selectedCatForItems, setSelectedCatForItems] = useState("");
  const [items, setItems] = useState([]);

  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCalories, setItemCalories] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemImg, setItemImg] = useState(""); // هنا نحط الرابط أو الـbase64

  // تحميل الأقسام من Firestore
  async function loadCategories() {
    const qCats = query(collection(db, "menuCategories"), orderBy("order", "asc"));
    const snap = await getDocs(qCats);
    const list = [];
    for (const d of snap.docs) {
      list.push({ id: d.id, ...d.data() });
    }
    setCats(list);

    // لو مافي قسم محدد للمنتجات، خذ أول قسم
    if (!selectedCatForItems && list.length > 0) {
      setSelectedCatForItems(list[0].id);
    }
  }

  // تحميل المنتجات لقسم واحد
  async function loadItems(catIdToLoad) {
    if (!catIdToLoad) {
      setItems([]);
      return;
    }
    const subCol = collection(db, "menuCategories", catIdToLoad, "items");
    const qItems = query(subCol, orderBy("order", "asc"));
    const snap = await getDocs(qItems);
    const list = [];
    for (const d of snap.docs) {
      list.push({ id: d.id, ...d.data() });
    }
    setItems(list);
  }

  // أول مرة
  useEffect(() => {
    loadCategories();
  }, []);

  // كل ما تغيّر القسم المختار للمنتجات → حمّل منتجاته
  useEffect(() => {
    if (selectedCatForItems) {
      loadItems(selectedCatForItems);
    }
  }, [selectedCatForItems]);

  // حفظ قسم جديد أو تعديل نفس الـID
  async function saveCategory(e) {
    e.preventDefault();
    if (!catId.trim()) {
      alert("لازم تكتب معرّف القسم (ID).");
      return;
    }
    const ref = doc(db, "menuCategories", catId.trim());

    await setDoc(ref, {
      title: catTitle || "",
      order: Number(catOrder) || 0,
      bannerTop: catBannerTop || "",
      bannerAfter: catBannerAfter || "",
    });

    alert("تم حفظ القسم 👍");
    // نظّف الحقول
    setCatId("");
    setCatTitle("");
    setCatOrder("");
    setCatBannerTop("");
    setCatBannerAfter("");

    await loadCategories();
  }

  // حذف قسم بالكامل (مع المنتجات داخله راح تظل بس ما نبغى نتركه معتمد عليك تنظف يدوي لو تبغى)
  async function removeCategory(id) {
    if (!window.confirm("متأكد تبغى تحذف هذا القسم بالكامل؟")) return;
    await deleteDoc(doc(db, "menuCategories", id));
    alert("تم حذف القسم");
    if (selectedCatForItems === id) {
      setSelectedCatForItems("");
      setItems([]);
    }
    await loadCategories();
  }

  // حفظ منتج جديد داخل القسم المختار
  async function saveItem(e) {
    e.preventDefault();
    if (!selectedCatForItems) {
      alert("اختر قسم أولاً");
      return;
    }
    if (!itemName.trim()) {
      alert("اكتب اسم المنتج");
      return;
    }

    // نخلي معرف المنتج بسيط من الاسم + وقت
    const newId =
      itemName.trim().replace(/\s+/g, "_").slice(0, 30) +
      "_" +
      Date.now().toString().slice(-5);

    const ref = doc(
      db,
      "menuCategories",
      selectedCatForItems,
      "items",
      newId
    );

    await setDoc(ref, {
      name: itemName || "",
      price: Number(itemPrice) || 0,
      calories: itemCalories ? Number(itemCalories) : undefined,
      desc: itemDesc || "",
      img: itemImg || "",
      order: Date.now(), // ترتيب بسيط مؤقت
    });

    alert("تم حفظ المنتج ✅");

    // نظف حقول المنتج
    setItemName("");
    setItemPrice("");
    setItemCalories("");
    setItemDesc("");
    setItemImg("");

    // رجّع القائمة
    await loadItems(selectedCatForItems);
  }

  // حذف منتج
  async function removeItem(itemId) {
    if (!window.confirm("تحذف هذا المنتج؟")) return;
    const ref = doc(
      db,
      "menuCategories",
      selectedCatForItems,
      "items",
      itemId
    );
    await deleteDoc(ref);
    alert("انحذف المنتج");
    await loadItems(selectedCatForItems);
  }

  // مساعد: نحول ملف لصورة base64
  function handleImageFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result; // data:image/...
      setItemImg(base64);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ backgroundColor: "#003c37", minHeight: "100vh", color: "#fff", padding: "16px" }}>
      <h1>لوحة التحكم 🛠</h1>

      {/* ===================== إدارة الأقسام ===================== */}
      <section
        style={{
          backgroundColor: "#002d2a",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
          boxShadow: "0 10px 20px rgba(0,0,0,0.5)",
        }}
      >
        <h2>إضافة / تعديل قسم</h2>
        <p style={{ fontSize: "14px", opacity: 0.8 }}>
          اكتب الـ ID (مثلا "pizza")، العنوان، الترتيب، وروابط البانرات.
          لو الـID موجود رح نحدثه، لو مو موجود رح ننشئه.
        </p>

        <form onSubmit={saveCategory} style={{ display: "grid", gap: "8px", maxWidth: "480px" }}>
          <input
            placeholder="معرف القسم (id) - مثال: pizza"
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: 0 }}
          />
          <input
            placeholder="العنوان الظاهر - مثال: البيتزا"
            value={catTitle}
            onChange={(e) => setCatTitle(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: 0 }}
          />
          <input
            placeholder="الترتيب (order) مثال: 2"
            value={catOrder}
            onChange={(e) => setCatOrder(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: 0 }}
          />
          <input
            placeholder="رابط Banner أعلى القسم (bannerTop)"
            value={catBannerTop}
            onChange={(e) => setCatBannerTop(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: 0 }}
          />
          <input
            placeholder="رابط Banner بعد القسم (bannerAfter)"
            value={catBannerAfter}
            onChange={(e) => setCatBannerAfter(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: 0 }}
          />

          <button
            type="submit"
            style={{
              backgroundColor: "#0a925d",
              color: "#fff",
              padding: "10px 14px",
              borderRadius: "6px",
              border: 0,
              fontWeight: "600",
            }}
          >
            حفظ القسم
          </button>
        </form>

        <hr style={{ margin: "24px 0", borderColor: "#0a925d" }} />

        <h3>الأقسام الحالية</h3>
        {cats.length === 0 ? (
          <p style={{ opacity: 0.7 }}>مافي أقسام لسه.</p>
        ) : (
          <table style={{ width: "100%", maxWidth: "800px", backgroundColor: "#001f1d" }}>
            <thead>
              <tr style={{ backgroundColor: "#00423b", color: "#fff" }}>
                <th>ID</th>
                <th>العنوان</th>
                <th>الترتيب</th>
                <th>bannerTop</th>
                <th>bannerAfter</th>
                <th>إدارة</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id}>
                  <td style={{ color: "#0affc7" }}>{c.id}</td>
                  <td>{c.title}</td>
                  <td>{c.order}</td>
                  <td style={{ maxWidth: "150px", wordBreak: "break-all", fontSize: "12px" }}>
                    {c.bannerTop || "-"}
                  </td>
                  <td style={{ maxWidth: "150px", wordBreak: "break-all", fontSize: "12px" }}>
                    {c.bannerAfter || "-"}
                  </td>
                  <td>
                    <button
                      style={{
                        backgroundColor: "#ffaa00",
                        marginInlineEnd: "6px",
                        border: 0,
                        padding: "6px 10px",
                        borderRadius: "4px",
                        fontWeight: "600",
                      }}
                      onClick={() => {
                        setCatId(c.id);
                        setCatTitle(c.title || "");
                        setCatOrder(String(c.order ?? ""));
                        setCatBannerTop(c.bannerTop || "");
                        setCatBannerAfter(c.bannerAfter || "");
                        setSelectedCatForItems(c.id);
                      }}
                    >
                      تعديل / اختيار للمنتجات
                    </button>

                    <button
                      style={{
                        backgroundColor: "#c71818",
                        color: "#fff",
                        border: 0,
                        padding: "6px 10px",
                        borderRadius: "4px",
                        fontWeight: "600",
                      }}
                      onClick={() => removeCategory(c.id)}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ===================== إدارة المنتجات ===================== */}
      <section
        style={{
          backgroundColor: "#002d2a",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "24px",
          boxShadow: "0 10px 20px rgba(0,0,0,0.5)",
        }}
      >
        <h2>إضافة منتج داخل قسم</h2>

        {/* اختيار القسم اللي نضيف فيه المنتج */}
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "block", marginBottom: "4px" }}>
            اختر القسم:
          </label>
          <select
            value={selectedCatForItems}
            onChange={(e) => setSelectedCatForItems(e.target.value)}
            style={{
              padding: "8px",
              borderRadius: "4px",
              border: 0,
              minWidth: "200px",
            }}
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title || c.id}
              </option>
            ))}
          </select>
        </div>

        {/* فورم المنتج */}
        <form
          onSubmit={saveItem}
          style={{ display: "grid", gap: "8px", maxWidth: "480px" }}
        >
          <input
            placeholder="اسم المنتج"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: 0 }}
          />

          <input
            placeholder="السعر (مثال: 12)"
            value={itemPrice}
            onChange={(e) => setItemPrice(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: 0 }}
          />

          <input
            placeholder="السعرات الحرارية (اختياري)"
            value={itemCalories}
            onChange={(e) => setItemCalories(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: 0 }}
          />

          <textarea
            placeholder="وصف قصير (اختياري)"
            value={itemDesc}
            onChange={(e) => setItemDesc(e.target.value)}
            style={{ padding: "8px", borderRadius: "4px", border: 0, minHeight: "60px" }}
          />

          <div
            style={{
              backgroundColor: "#001f1d",
              borderRadius: "6px",
              padding: "8px",
            }}
          >
            <div style={{ fontSize: "14px", marginBottom: "4px" }}>
              الصورة:
            </div>

            <input
              type="text"
              placeholder="أو الصق رابط صورة مباشر https://...."
              value={itemImg}
              onChange={(e) => setItemImg(e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "4px",
                border: 0,
                marginBottom: "6px",
                wordBreak: "break-all",
              }}
            />

            <div style={{ fontSize: "12px", opacity: 0.8, marginBottom: "4px" }}>
              أو اختر ملف صورة (نحوّله Base64 تلقائياً ونحفظه في الحقل):
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageFile}
              style={{
                backgroundColor: "#fff",
                color: "#000",
                borderRadius: "4px",
                padding: "6px",
              }}
            />
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: "#0a925d",
              color: "#fff",
              padding: "10px 14px",
              borderRadius: "6px",
              border: 0,
              fontWeight: "600",
              marginTop: "8px",
            }}
          >
            حفظ المنتج
          </button>
        </form>

        <hr style={{ margin: "24px 0", borderColor: "#0a925d" }} />

        <h3>منتجات هذا القسم</h3>
        {items.length === 0 ? (
          <p style={{ opacity: 0.7 }}>مافي منتجات لسه في هذا القسم.</p>
        ) : (
          <table style={{ width: "100%", maxWidth: "800px", backgroundColor: "#001f1d" }}>
            <thead>
              <tr style={{ backgroundColor: "#00423b", color: "#fff" }}>
                <th>الاسم</th>
                <th>السعر</th>
                <th>سعرات</th>
                <th>وصف</th>
                <th>صورة</th>
                <th>حذف</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td>{it.price} ر.س</td>
                  <td>{it.calories ?? "-"}</td>
                  <td style={{ maxWidth: "150px", wordBreak: "break-all", fontSize: "12px" }}>
                    {it.desc || "-"}
                  </td>
                  <td style={{ maxWidth: "120px", wordBreak: "break-all", fontSize: "11px" }}>
                    {it.img ? (
                      <>
                        <div
                          style={{
                            width: "60px",
                            height: "60px",
                            borderRadius: "4px",
                            overflow: "hidden",
                            backgroundColor: "#000",
                            marginBottom: "4px",
                          }}
                        >
                          <img
                            src={it.img}
                            alt={it.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                        <div style={{ direction: "ltr" }}>{it.img.slice(0, 30)}...</div>
                      </>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td>
                    <button
                      style={{
                        backgroundColor: "#c71818",
                        color: "#fff",
                        border: 0,
                        padding: "6px 10px",
                        borderRadius: "4px",
                        fontWeight: "600",
                      }}
                      onClick={() => removeItem(it.id)}
                    >
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
