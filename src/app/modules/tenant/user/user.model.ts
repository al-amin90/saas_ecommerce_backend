import { model, Schema } from "mongoose";
import { IUser, IUserModel } from "./user.interface";
import bcrypt from "bcrypt";
import config from "../../../config";

const userSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: 0,
    },
    needsPasswordChange: {
      type: Boolean,
      default: true,
    },
    passwordChangeAt: {
      type: Date,
    },
    role: {
      type: String,
      enum: ["admin", "moderator", "user", "super_admin"],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    statics: {
      async isUserExistByCustomId(id: string) {
        return this.findById(id).select("+password");
      },

      async isPasswordMatch(planTextPassword, hashTextPassword) {
        return await bcrypt.compare(planTextPassword, hashTextPassword);
      },
      async isJWTIssuedBeforePassword(
        passwordChangeTimeStamp,
        jwtIssuedTimeStamp,
      ) {
        const changeTime = new Date(passwordChangeTimeStamp).getTime() / 1000;
        return changeTime > jwtIssuedTimeStamp;
      },
    },
    timestamps: true,
  },
);

userSchema.pre("save", async function () {
  this.password = await bcrypt.hash(
    this.password,
    Number(config.bcrypt_salt_rounds),
  );
});

userSchema.post("save", async function (doc, next) {
  doc.password = "";
  next();
});

export default userSchema;
