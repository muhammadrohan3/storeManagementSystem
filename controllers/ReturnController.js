const ReturnModel = require('../models/Return');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Entry = require('../models/Entry');
const Inventory = require('../models/Inventory');
const { ReturnValidator } = require('../middlewares/Validator');

const ReturnController = {};


ReturnController.create = async (req, res) => {
    const { customer, product, quantity, amount, returnDate } = req.body;
    const validator = ReturnValidator({ customer, product, quantity, amount });
    if (validator.error) {
        req.flash('error', validator.error);
        return res.redirect('/returns');
    }
    const getProduct = await Product.findOne({code: validator.value.product});
    if(!getProduct) {
        req.flash('error', 'Product code doesn\'t match. Try again!');
        return res.redirect('/returns');
    }
    const getCustomer = await Customer.findOne({phone: validator.value.customer});
    if(!getCustomer) {
        req.flash('error', 'User doesn\'t exist with this ID. Please try again!');
        return res.redirect('/returns');
    }
    const getInventory = await Inventory.findOne({product: getProduct._id});
    if(getInventory.sales < quantity){
        req.flash('error', `Oops! You can't return more products than sales.`);
        return res.redirect('/returns');
    }
    try{
        const { quantity, amount } = validator.value;
        const newEntry = await new Entry({
            product: getProduct._id,
            quantity,
            type: 'return'
        }).save();
        let setReturnDate = returnDate || new Date();
        await new ReturnModel({
            entry: newEntry._id, customer: getCustomer._id, product: getProduct._id,
            quantity, amount, returnDate: setReturnDate
        }).save();
        req.flash('success', `A new Returns record has been added successfully!`);
        return res.redirect('/returns');
    } catch (e) {
        req.flash('error', `Error While Saving Data - ${e}`);
        return res.redirect('/returns');
    }
};


ReturnController.read = async (req, res) => {
    const perPage = 30;
    const page = req.params.page || 1;
    const returnRecords = await ReturnModel.find({}).skip((perPage * page) - perPage).limit(perPage).populate('product').populate('customer').sort({createdAt: -1});
    const  count =  await ReturnModel.countDocuments();
    res.render('returns/index', { returnRecords, current: page, pages: Math.ceil(count / perPage)});
};


ReturnController.delete = async (req, res) => {
    const getReturn = await ReturnModel.findByIdAndDelete(req.params.id);
    await Entry.findByIdAndDelete(getReturn.entry);
    req.flash('success', `Return has been deleted successfully!`);
    res.redirect('/returns');
};


ReturnController.update = async (req, res) => {
    const { entry, product, quantity, amount, returnDate } = req.body;
    const getProduct = await Product.findOne({code: product});
    const getInventory = await Inventory.findOne({product: getProduct._id});
    if(getInventory.sales < quantity){
        req.flash('error', `Oops! You can't return more product than you sales.`);
        return res.redirect('/return');
    }
    await Entry.findByIdAndUpdate(entry, {$set: {quantity}});
    await ReturnModel.findByIdAndUpdate(req.params.id, { $set: {quantity, amount, returnDate}});
    req.flash('success', `Returns information has been updated successfully!`);
    res.redirect('/returns');
};


ReturnController.getReturn = async (req, res) => {
    try {
        const { entry, customer, product, quantity, amount, returnDate } = await ReturnModel.findById(req.params.id).populate('product').populate('customer');
        const getProduct = await Product.findById(product);
        const getCustomer = await Customer.findById(customer);
        if (entry) {
            return res.send({
                entry, customer: getCustomer.phone, product: getProduct.code, quantity, amount, returnDate
            });
        }
        return res.send("Return Doesn't Exist");
    } catch (e) {
        return '';
    }
};


module.exports = ReturnController;