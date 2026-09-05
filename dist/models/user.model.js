import mongoose, { Schema } from 'mongoose';
const userSchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        maxlength: 255,
    },
    passwordHash: { type: String, required: true, select: false },
    timezone: { type: String, required: true, default: 'UTC', maxlength: 64 },
}, { timestamps: true });
userSchema.methods.toPublic = function toPublic() {
    return {
        id: this._id.toString(),
        name: this.name,
        email: this.email,
        timezone: this.timezone,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};
export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
//# sourceMappingURL=user.model.js.map