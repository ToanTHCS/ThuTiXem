const GITHUB_SAVE_PROGRESS_URL = 'https://api.github.com/repos/ToanTHCS/ThuTiXem/contents/progress.json';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN; // ✅ Biến môi trường chỉ được dùng trên server-side

export default async function handler(req, res) {
    if (!GITHUB_TOKEN) {
        console.error("❌ Lỗi: GITHUB_TOKEN chưa được thiết lập trên server!");
        return res.status(500).json({ error: "GITHUB_TOKEN chưa tồn tại. Kiểm tra biến môi trường trên Vercel." });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed. Chỉ hỗ trợ POST." });
    }

    console.log("📥 API nhận request:", req.body);

    const { progressData, studentId } = req.body;
    if (!progressData || typeof progressData !== "object" || !studentId) {
        console.error("❌ Lỗi: Dữ liệu không hợp lệ:", progressData);
        return res.status(400).json({ error: "Dữ liệu không hợp lệ hoặc thiếu `studentId`." });
    }

    let existingData = {};
    let sha = null;

    try {
        console.log("📥 [API] Đang lấy dữ liệu `progress.json` từ GitHub...");
        const shaResponse = await fetch(GITHUB_SAVE_PROGRESS_URL, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `Bearer ${GITHUB_TOKEN}`
            }
        });

        if (shaResponse.ok) {
            const shaData = await shaResponse.json();
            sha = shaData.sha || null;
            existingData = JSON.parse(atob(shaData.content)); // ✅ Giữ lại dữ liệu cũ để không ghi đè toàn bộ file
            console.log("✅ Dữ liệu `progress.json` đã tải thành công.");
        } else if (shaResponse.status === 404) {
            console.warn("⚠ `progress.json` chưa tồn tại, sẽ tạo mới.");
        } else {
            const errorDetails = await shaResponse.json();
            console.error("❌ Lỗi khi lấy dữ liệu từ GitHub:", errorDetails);
            return res.status(500).json({ error: "Lỗi khi lấy dữ liệu từ GitHub.", details: errorDetails });
        }
    } catch (error) {
        console.error("❌ Lỗi khi tải `progress.json`:", error);
        return res.status(500).json({ error: "Lỗi khi tải `progress.json`." });
    }

    // ✅ Cập nhật hoặc thêm tiến trình của học sinh vào dữ liệu chung
    existingData[studentId] = progressData;

    try {
        console.log("📤 [API] Đang ghi dữ liệu `progress.json` lên GitHub...");
        const content = Buffer.from(JSON.stringify(existingData, null, 2)).toString('base64');

        const saveResponse = await fetch(GITHUB_SAVE_PROGRESS_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GITHUB_TOKEN}`
            },
            body: JSON.stringify({
                message: `Cập nhật tiến trình học sinh ${studentId}`,
                content: content,
                sha: sha || null
            })
        });

        const saveData = await saveResponse.json();
        console.log("📤 [API] Response từ GitHub:", saveData);

        if (!saveResponse.ok) {
            return res.status(500).json({ error: "Lỗi khi lưu tiến trình vào GitHub.", details: saveData });
        }

        return res.status(200).json({ message: "✅ Tiến trình đã lưu thành công!", data: saveData });

    } catch (error) {
        console.error("❌ Lỗi khi ghi dữ liệu lên GitHub:", error);
        return res.status(500).json({ error: "Lỗi khi ghi dữ liệu lên GitHub." });
    }
}
