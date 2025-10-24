import React, { useEffect, useState } from "react";
import axios from "axios";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const userId = localStorage.getItem("userId"); // Must be set on login

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userId) return;

      try {
        const res = await axios.get(`https://eatfit-ecwm.onrender.com/api/orders/myOrders/${userId}`);
        setOrders(res.data.orders || []);
      } catch (err) {
        console.error(err);
        alert("Error fetching your orders");
      }
    };

    fetchOrders();
  }, [userId]);

  const getTotalPrice = (cartItems) => {
    return cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  };

  if (!userId) {
    return <p className="m-3">Please login to see your orders.</p>;
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-4">My Orders</h2>

      {orders.length === 0 ? (
        <p>You have no past orders.</p>
      ) : (
        orders.map((order) => (
          <div key={order._id} className="card mb-4 shadow-sm">
            <div className="card-header">
              <strong>Order ID:</strong> {order._id} <br />
              <strong>Status:</strong> {order.status} <br />
              <strong>Payment:</strong> {order.paymentMethod} <br />
              <strong>Address:</strong> {order.address} <br />
              <strong>Ordered At:</strong> {new Date(order.createdAt).toLocaleString()}
            </div>
            <div className="card-body">
              <h5 className="card-title">Items:</h5>
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Qty</th>
                    <th>Size</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {order.cartItems.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td>{item.qty}</td>
                      <td>{item.size}</td>
                      <td>₹{item.price * item.qty}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan="3" style={{ textAlign: "right", fontWeight: "bold" }}>Total:</td>
                    <td style={{ fontWeight: "bold" }}>₹{getTotalPrice(order.cartItems)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}


