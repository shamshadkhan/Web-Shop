const Order = require("../models/order");
const responseUtils = require('../utils/responseUtils');

/**
 * Send all orders as JSON
 * For admins return a collection of all orders in the system.  
 * For a customer return a collection of this user's OWN orders.
 * 
 * @param {http.ServerResponse} response http response
 * @param {object} currentUser (mongoose document object)
 *  
 */
const getAllOrders = async(response, currentUser) => {
    if ( currentUser.role === "admin" ){
        return responseUtils.sendJson(response, await Order.find({}), 200);
    }
    
    const orders = await Order.find({customerId : currentUser.id});
    if ( !orders ){
        return responseUtils.badRequest(response, "No order");
    }
    return responseUtils.sendJson(response, orders, 200);
};

/**
 * Get information about a single order as JSON. 
 * For admins return the order in the system. 
 * For a customer return the order if it is their OWN order.
 * 
 * @param {http.ServerResponse} response http response
 * @param {string} orderId order id
 * @param {object} currentUser (mongoose document object)
 */
const viewOrder = async(response, orderId, currentUser) => {
    const order = await Order.findById(orderId).exec();
    if ( !order ){
        return responseUtils.notFound(response);
    }
    // a Customer user tried to access someone else's order 
    if ( currentUser.role === "customer") {
        if ( order.customerId.toString() !== currentUser.id ) {
            return responseUtils.notFound(response);
        }
    }
    return responseUtils.sendJson(response, order, 200);
};

/**
 * Delete order and send deleted order as JSON
 *
 * @param {http.ServerResponse} response http response
 * @param {string} orderId order id
 * @param {object} currentUser (mongoose document object)
 */
const deleteOrder = async(response, orderId, currentUser) => {
    if ( currentUser.role === "customer" ){
        return responseUtils.forbidden(response);
    }

    const order = await Order.findById(orderId).exec();

    if ( !order ){
        return responseUtils.notFound(response);
    }

    await Order.deleteOne({ _id: orderId}).then(function(){
        return responseUtils.sendJson(response, order, 200);
    });
};

/**
 * Place a new order and send created order back as JSON
 * 
 * @param {http.ServerResponse} response http response
 * @param {object} currentUser mongoose document object
 * @param {object} orderData JSON data from request body
 */

const placeOrder = async(response, currentUser, orderData) => {
      // Only customer can place a new order
    if ( currentUser.role === "admin" ){
        return responseUtils.forbidden(response);
    }

    if ( orderData.items.length === 0) {
        return responseUtils.badRequest(response, "Item cannot be empty");
    }
    const orders = orderData.items;
    // orders.forEach(it => {
    //     console.log(it);
    //     console.log(it.product);
    //     console.log(it.quantity);
    //     if ( !it.product ){
    //         return responseUtils.badRequest(response, "Product missing");
    //     }
    //     if ( !it.quantity ) {
    //         return responseUtils.badRequest(response, "Product missing");
    //     }
    //     const product = it.product;
    //     if ( !product._id || !product.name || !product.price ){
    //         return responseUtils.badRequest(response, "Invalid product");
    //     }
    // });
    for (let i = 0; i < orders.length; i++){
        if ( !orders[i].product || !orders[i].quantity){
            return responseUtils.badRequest(response, 
                !orders[i].product?"Product missing":"Quantity missing");
        }

        const item = orders[i].product;
        if ( !item._id || !item.name || !item.price){
            return responseUtils.badRequest(response, "Invalid requirement");
        }
    }

    const newOder = new Order({
        customerId : currentUser.id,
        items : orderData.items
    });
    await newOder.save();
    return responseUtils.createdResource(response, newOder);
};

module.exports = {getAllOrders, viewOrder, deleteOrder, placeOrder};