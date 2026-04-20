/**
 * העתק לבקאנד (למשל src/models/FormSubmission.js)
 * דורש: mongoose
 */
import mongoose from "mongoose";

const formSubmissionSchema = new mongoose.Schema(
  {
    formCode: { type: String, required: true, index: true },
    submittedAt: { type: String, required: true },
    melaketId: { type: String, default: null },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export const FormSubmission =
  mongoose.models.FormSubmission ||
  mongoose.model("FormSubmission", formSubmissionSchema);
