const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BabyDataSchema = new Schema({
    baby_id: { type: Schema.Types.ObjectId, ref: 'Bebe' },
    temperature: Number,
    spo2: Number,
    bpm:Number
    // Ajoutez d'autres champs si nécessaire
}, { timestamps: true });

const BabyData = mongoose.model('BabyData', BabyDataSchema);

module.exports = BabyData;
