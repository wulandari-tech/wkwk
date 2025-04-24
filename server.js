// backend.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const btoa = require('btoa');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// KUNCI SERVER DIGABUNGKAN LANGSUNG KE KODE (SANGAT TIDAK DISARANKAN!)
const midtransServerKey = 'Mid-server-zvgGUiY7SS-HS_qhWLkqZQuL'; //GANTI INI DENGAN KUNCI BARU ANDA!

if (!midtransServerKey) {
    console.error('ERROR: MIDTRANS_SERVER_KEY tidak ditemukan!');
    process.exit(1);
}

app.post('/api/qris-charge', async (req, res) => {
    try {
        // 1. Validasi Data (SANGAT PENTING!)
        const { order_id, gross_amount, acquirer, photo_url } = req.body; // Tambahkan photo_url

        if (!order_id || !gross_amount || !acquirer) {
            return res.status(400).json({ error: 'Parameter wajib kurang (order_id, gross_amount, acquirer)' });
        }

        // Validasi lebih detail (contoh)
        if (typeof order_id !== 'string' || order_id.length < 5 || order_id.length > 50) {
            return res.status(400).json({ error: 'Format order_id tidak valid' });
        }

        if (typeof gross_amount !== 'number' || gross_amount <= 10000 || gross_amount > 1000000) {
            return res.status(400).json({ error: 'Jumlah pembayaran (gross_amount) tidak valid' });
        }

        if (acquirer !== 'gopay') {
            return res.status(400).json({ error: 'Acquirer tidak valid. Hanya gopay yang didukung saat ini.' });
        }

        // Validasi photo_url (opsional, tapi disarankan)
        if (photo_url && typeof photo_url !== 'string') {
            return res.status(400).json({ error: 'Format photo_url tidak valid' });
        }

        // 2. Siapkan Payload untuk Midtrans
        const midtransEndpoint = 'https://api.sandbox.midtrans.com/v2/charge';
        const midtransAuth = 'Basic ' + btoa(midtransServerKey + ':');

        const midtransPayload = {
            payment_type: 'qris',
            transaction_details: {
                order_id: order_id,
                gross_amount: gross_amount,
            },
            qris: {
                acquirer: acquirer,
            },
            photo_url: photo_url // Tambahkan photo_url ke payload (ini tidak dikirim ke Midtrans, hanya untuk respon)
        };

        const midtransHeaders = {
            accept: 'application/json',
            authorization: midtransAuth,
            'content-type': 'application/json',
        };

        // 3. Kirim Permintaan ke Midtrans
        console.log('Mengirim permintaan ke Midtrans...');
        const midtransResponse = await axios.post(midtransEndpoint, midtransPayload, { headers: midtransHeaders });

        // 4. Tangani Respon dari Midtrans
        if (midtransResponse.status === 201) {
            console.log('Transaksi QRIS berhasil dibuat di Midtrans!');
            console.log('Respon Midtrans:', JSON.stringify(midtransResponse.data, null, 2));

            // Kirim balik respon dari Midtrans ke client, termasuk photo_url
            const responseData = {
                ...midtransResponse.data,
                photo_url: photo_url // Sertakan photo_url dalam respons
            };
            res.status(201).json(responseData);


        } else {
            console.error('ERROR: Gagal membuat transaksi QRIS di Midtrans');
            console.error('Respon Midtrans:', JSON.stringify(midtransResponse.data, null, 2));

            // Kirim pesan error yang lebih informatif ke client
            res.status(midtransResponse.status).json({
                error: 'Gagal membuat transaksi QRIS di Midtrans',
                midtransResponse: midtransResponse.data,
            });
        }
    } catch (error) {
        console.error('ERROR: Terjadi kesalahan saat memproses permintaan ke Midtrans:', error);

        // Kirim pesan error yang lebih informatif ke client
        res.status(500).json({
            error: 'Terjadi kesalahan internal server',
            details: error.message,
        });
    }
});

// Route handler untuk menangani "Cannot GET /" (penting jika menggunakan SPA)
app.get('/', (req, res) => {
    res.send('Backend API is running.  Use /api/qris-charge to create a QRIS charge.');
});


app.listen(port, () => {
    console.log(`Backend berjalan di http://localhost:${port}`);
});