const express = require("express");
require('dotenv').config()
const stripe = require("stripe")(process.env.stripe_secrete_key)
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
// app.use(cors());
/* middleware */
app.use(
    cors({
        origin: [process.env.Client_Domain],
        credentials: true,
        optionSuccessStatus: 200,
    })
)
app.use(express.json());
app.get("/", (req, res) => {
    res.send("Hi Developer Assignment-11 Server is Running !");
})
app.listen(port, () => {
    console.log(`THE SERVER LISTING PORT ON ${port}`);
})

/* firebase admin sdk  start here */
var admin = require("firebase-admin");
var serviceAccount = require("./FirebaseSdk.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
/* end sdk */
/* mongodb start here */
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.BD_PASS}@cluster0.sxgnyhx.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        /* create database and collection */
        const database = client.db("assignment_11");
        const userCollection = database.collection("users");
        const libraryBookCollection = database.collection("library");
        const placeOrderInformation = database.collection("order")
        const allWishlist = database.collection("wishlist")
        const alReview = database.collection("review")
        const carouselData = database.collection("carousel")
        const bookQuestion = database.collection("question")
        const customerFeedBack = database.collection("feedback")


        /* write your all api here.... */
        app.post("/create-checkout-session", async (req, res) => {
            const paymentInfo = req.body;

            console.log(paymentInfo);

            const session = await stripe.checkout.sessions.create({
                line_items: [
                    {
                        price_data: {
                            currency: "USD",
                            unit_amount: paymentInfo?.Price * 100,
                            product_data: {
                                name: paymentInfo?.BookName,
                                images: [paymentInfo?.image],

                            },
                        },

                        quantity: paymentInfo?.quantity,
                    },
                ],
                mode: 'payment',
                customer_email: paymentInfo.email,
                metadata: {
                    bookId: paymentInfo?._id,
                    name: paymentInfo?.name,
                    email: paymentInfo?.email

                },

                success_url: `${process.env.Client_Domain}/payment?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${process.env.Client_Domain}/dashboard/MyOrder`,


            })
            res.send({ url: session.url })

        })
        app.post("/payment-status", async (req, res) => {
            const { sessionId } = req.body
            const session = await stripe.checkout.sessions.retrieve(sessionId)
            if (session.status === "complete") {
                const paymentInfo = {
                    bookId: session.metadata.bookId,
                    transactionId: session.payment_intent,
                    Price: session.amount_total / 100,



                }
                await placeOrderInformation.updateOne({ _id: new ObjectId(paymentInfo.bookId) }, {
                    $set: {
                        paymentStatus: session.payment_status,
                        transactionId: paymentInfo.transactionId,
                        createDate: new Date().toISOString()

                    }
                })

            }
            console.log(session);


        })
        //save userCollection database
        app.post("/users", async (req, res) => {
            const userData = req.body;
            userData.create_at = new Date().toISOString()
            userData.lastLogin_at = new Date().toISOString()
            userData.role = "user"
            const query = { email: userData.email }
            const existUser = await userCollection.findOne(query)
            console.log("user already exist -->", !!existUser);
            if (existUser) {
                console.log("update user -->");
                const result = await userCollection.updateOne(query, {
                    $set: { lastLogin_at: new Date().toISOString() }
                })
                return res.send(result)
            }
            const result = await userCollection.insertOne(userData)
            console.log(userData);
            res.send(result)
        })
        // user role api
        app.get("/users/role/:email", async (req, res) => {
            const email = req.params.email;
            const result = await userCollection.findOne({ email })
            res.send({ role: result?.role })
        })
        app.get("/profileUser/role/:email", async (req, res) => {
            const email = req.params.email;
            const result = await userCollection.findOne({ email })
            res.send(result)
        })
        app.put("/users/role/:email", async(req, res) => {
            const email = req.params.email;
            const filter={email:email}
            const updateData = req.body;
            const update = {
                $set: updateData
            }
            const result = await userCollection.updateOne(filter, update)
            res.send(result)

        })
        // all book library
        app.post("/library", async (req, res) => {
            const data = req.body;
            const result = await libraryBookCollection.insertOne(data)
            res.send(result)


        })
        app.get("/allLibraryBook", async (req, res) => {
            const result = await libraryBookCollection.find().toArray()
            res.send(result)
        })
        app.put('/updateBook/:id', async (req, res) => {
            const id = req.params.id;
            const updateData = req.body;
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: updateData
            }
            const result = await libraryBookCollection.updateOne(query, update)
            res.send(result)
        })
        // all book api ------------->
        app.get("/allBookLibrary", async (req, res) => {
            const result = await libraryBookCollection.find().toArray();
            res.send(result)
        })
        app.get('/book/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await libraryBookCollection.findOne(query)
            res.send(result)
        })
        // place order info
        app.post("/placeOrder", async (req, res) => {
            const orderData = req.body;
            const result = await placeOrderInformation.insertOne(orderData)
            res.send(result)
        })
        /* all user get */
        app.get("/allUser", async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })
        /* admin api  */
        app.patch("/make-librarian/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: { role: "Librarian" }
            }
            const result = await userCollection.updateOne(query, update)
            res.send(result)
        })
        app.patch("/make-Admin/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: { role: "Admin" }
            }
            const result = await userCollection.updateOne(query, update)
            res.send(result)
        })
        /* manage book api-----------> */
        app.get("/manage-book", async (req, res) => {
            const result = await libraryBookCollection.find().toArray()
            res.send(result)
        })
        app.patch("/category-manage/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const book = await libraryBookCollection.findOne(query)
            const updateCategory = book.Category === "published" ? "unpublished" : "published"
            const update = {
                $set: { Category: updateCategory }
            }
            const result = await libraryBookCollection.updateOne(query, update)
            res.send(result)
        })
        app.delete("/order-book/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const deleteBook = await libraryBookCollection.deleteOne(query)
            const deleteOrder = await placeOrderInformation.deleteMany({ bookId: id })
            res.send(deleteBook, deleteOrder)

        })
        /* my order  */
        app.get("/librarianOrderControl", async (req, res) => {
            const result = await placeOrderInformation.find().toArray()
            res.send(result)

        })
        app.patch("/orders/status/:id", async (req, res) => {
            const id = req.params.id;
            const { status } = req.body;
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: { status: status }
            }
            const result = await placeOrderInformation.updateOne(query, update)
            res.send(result)
        })
        app.delete("/delete/order/:id", async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await placeOrderInformation.deleteOne(query)
            res.send(result)
        })
        app.get("/book-order-info/:email", async (req, res) => {
            const email = req.params.email
            const result = await placeOrderInformation.find({ email: email }).toArray()
            res.send(result)
        })
        app.patch("/cancel-order-pending/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const update = {
                $set: {
                    status: "cancelled"
                }
            }
            const order = await placeOrderInformation.updateOne(query, update)
            res.send(order)

        })
        /* invoice page */
        app.get("/invoice/:email", async (req, res) => {
            const email = req.params.email
            const result = await placeOrderInformation.find({ email: email }).toArray()
            res.send(result)
        })
        /* wishlist */
        app.post("/wishlist", async (req, res) => {
            const wishlistData = req.body;
            const result = await allWishlist.insertOne(wishlistData)
            res.send(result)
        })
        app.get("/unique/book/:email", async (req, res) => {
            const email = req.params.email;
            const result = await allWishlist.find({ email: email }).toArray()
            res.send(result)

        })
        // review
        app.post("/review", async (req, res) => {
            const newData = req.body;
            const result = await alReview.insertOne(newData)
            res.send(result)
        })
        app.get("/review/:bookId", async(req, res) => {
            const bookId = req.params.bookId

            const result = await alReview.find({ bookId }).toArray()
            res.send(result)
        })
        //sliders
        app.post("/carousel", async(req, res) => {
            const data = req.body
            const result = await carouselData.insertOne(data)
            res.send(result)
        })
        app.get("/myCarousel", async(req, res) => {
            const result = await carouselData.find().toArray()
            res.send(result)
        })
        app.get("/latest-book", async(req, res) => {
            const result = await libraryBookCollection.find().sort({ createAt:-1 }).limit(6).toArray()
            res.send(result)
        })
        //faq
        app.post("/question", async (req, res) => {
            const data = req.body
            const result = await bookQuestion.insertOne(data)
            res.send(result)
        })
        app.get("/customer-question", async (req, res) => {
            const result = await bookQuestion.find().toArray()
            res.send(result)
        })
        //feedback
        app.post("/feedback", async(req, res) => {
            const feed = req.body;
            const result = await customerFeedBack.insertOne(feed)
            res.send(result)
        })
        app.get("/our-feedback", async(req, res) => {
            const result = await customerFeedBack.find().toArray()
            res.send(result)
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

    }
}
run().catch(console.dir);
