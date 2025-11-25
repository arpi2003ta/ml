import { Exam, ExamSubmission } from "../models/AIExaminer.model.js";
import { uploadMedia, deleteMediaFromCloudinary } from "../utils/cloudinary.js";

export const uploadExam = async (req, res)=>{
    try{
        const instructorId  = req.id;
        const {name}=req.body;
        const existingExam = await Exam.findOne();

        let newExamData = {};
        let oldPublicIds = [];

        if(name){
            newExamData.name= name;
        }

        if(req.files && req.files.questions){
            const questionFile = req.files.questions[0];   
            const questionResponse = await uploadMedia(questionFile.path);
            if(!questionResponse){
                return res.status(400).json({message:"Error on uploading question file"});
            }
            newExamData.questionPaper={
                url: questionResponse.secure_url,
                publicId: questionResponse.public_id
            };
            if(existingExam && existingExam.questionPaper){
                oldPublicIds.push(existingExam.questionPaper.publicId);
            }
        }
        
        if(req.files && req.files.answerKey){
            const answerKeyFile = req.files.answerKey[0];
            const answerKeyResponse = await uploadMedia(answerKeyFile.path);
            if(!answerKeyResponse){
                return res.status(400).json({message: "Error on uploading answerkey file"});
            }
            newExamData.answerKey={
                url: answerKeyResponse.secure_url,
                publicId: answerKeyResponse.public_id
            }
            if(existingExam && existingExam.answerKey){
                oldPublicIds.push(existingExam.answerKey.publicId);
            }
        }

        if(req.files && req.files.omr){
            const omrFile = req.files.omr[0];
            const omrResponse = await uploadMedia(omrFile.path);
            if(!omrResponse){
                return res.status(400).json({message:"Error on uploading omr file"});
            }
            newExamData.omrSheet = {
                url: omrResponse.secure_url,
                publicId: omrResponse.public_id
            }
            if(existingExam && existingExam.omrSheet){
                oldPublicIds.push(existingExam.omrSheet.publicId);
            }
        }

        if(existingExam){

            existingExam.set(newExamData);
            const updatedExam = await existingExam.save();

            if(oldPublicIds.length>0){
                await Promise.all(
                    oldPublicIds.filter(id=>id).map(id=> deleteMediaFromCloudinary(id))
                );
            }

            return res.status(200).json({
                success:true,
                message: "Exam updated successfully",
                exam: updatedExam
            })
        }else{
            if(!newExamData.name || !newExamData.questionPaper || !newExamData.answerKey || !newExamData.omrSheet){
                return res.status(400).json({message:"upload all files"})
            }
            newExamData.instructor = instructorId;
            const newExam = await Exam.create(newExamData);
            return res.status(200).json({
                success: true,
                message:"exam uploaded successfully",
                newExam
            })
        }
    }catch(err){
        return res.status(400).json({message:"Server error on exam upload"})
    }
}

export const getExam = async (req, res)=>{
    try{
        const exam = await Exam.findOne().select("-answerKey");
        if(!exam){
            return res.status(404).json({message:"no exam has been uploaded yet"});
        }

        const examDetail = {
            _id: exam._id,
            name: exam.name,
            questionPaperUrl: exam.questionPaper.url,
            omrSheetUrl: exam.omrSheet.url
        }

        return res.status(200).json({
            success:true,
            message:"Exam details",
            examDetail
        })
    }catch(err){
        return res.status(400).json({
            message:"error on hiting getExam controller",
            error: err
        })
    }
}

export const submitOmr = async (req, res)=>{
    try{

        const studentId = req.id;

        const exam = await Exam.findOne();
        if(!Exam){
            return res.status(404).json({message:"exam not found"});
        }

        const examId = exam._id;

        if(!req.file){
            return res.status(400).json({message:"please upload filled OMR"});
        }
        // const existingSubmission = await ExamSubmission.findOne();
        // // if(existingSubmission){
        // //     return res.status(400).json({message:"you have already submitted the project"});
        // // }

        const omrFile= req.file;
        const omrResponse = await uploadMedia(omrFile.path);
        if(!omrResponse){
            return res.status(400).json({
                success:false,
                message:"failed to upload filled Omr on the cloud"
            })
        }
        const newSubmission = await ExamSubmission.create({
            exam: examId,
            student: studentId,
            filledOmr:{
                url: omrResponse.secure_url,
                publicId: omrResponse.public_id
            }
        })

        return res.status(200).json({
            success:true,
            message:"Your Filled Omr Submitted Successfully",
            submission: newSubmission
        })
    }catch(err){
        return res.status(400).json({
            message: "error on hitting submitOmr controller",
            error: err
        })
    }
}