module.exports = (req, res) => {
  const secretMessage = process.env.MY_SECRET || "Biến môi trường chưa được thiết lập!";
  
  res.status(200).json({
    message: "✅ API hoạt động trên Vercel!",
    secret: secretMessage
  });
};
