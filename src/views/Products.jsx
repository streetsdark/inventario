import React, { useState } from 'react';
import { BsSearch, BsPlusCircle } from "react-icons/bs";

import ProfileCard from "../components/ProfileCard";
import ListProducts from "../components/ListProducts";
import FormProduct from "../components/FormProduct";
import useRole from "../hooks/useRole";
import "../css/products.css"

const Products = () => {

    const { isSuperUser } = useRole();
    const [query, setQuery] = useState("");
    const [stockFilter, setStockFilter] = useState("all");
    const [newProduct, setNewProduct] = useState(false);
    const [editProduct, setEditProduct] = useState({status: false, id: 0});

    return (
        <div className="content">
            <ProfileCard />
            <h1>Productos</h1>

            { !newProduct && !editProduct.status ?
            (<div className="actionSection">
                <div className="searchContainer">
                    <BsSearch size={22}/>
                    <input type="text" placeholder="Buscar producto..."
                        onChange={(e) => e.target.value.length >= 3 ? setQuery(e.target.value) : setQuery("")}
                    />
                </div>
                <div className="stockFilterGroup">
                    <button
                        type="button"
                        className={`stockFilterBtn ${stockFilter === "all" ? "active" : ""}`}
                        onClick={() => setStockFilter("all")}
                    >
                        Todos
                    </button>
                    <button
                        type="button"
                        className={`stockFilterBtn ${stockFilter === "high" ? "active" : ""}`}
                        onClick={() => setStockFilter("high")}
                    >
                        Stock alto
                    </button>
                    <button
                        type="button"
                        className={`stockFilterBtn ${stockFilter === "low" ? "active" : ""}`}
                        onClick={() => setStockFilter("low")}
                    >
                        Stock bajo
                    </button>
                    <button
                        type="button"
                        className={`stockFilterBtn ${stockFilter === "out" ? "active" : ""}`}
                        onClick={() => setStockFilter("out")}
                    >
                        Sin stock
                    </button>
                </div>
                {isSuperUser && (
                    <button className="add-product" onClick={() => setNewProduct(!newProduct)}>
                        <BsPlusCircle size={22} style={{ marginRight: 5 }}/>
                        <b>Añadir producto</b>
                    </button>
                )}
            </div>) : null }

            {
                newProduct || editProduct.status
                ? <FormProduct setNewProduct={setNewProduct} editProduct={editProduct} setEditProduct={setEditProduct} setQuery={setQuery}/>
                : <ListProducts query={query} stockFilter={stockFilter} setEditProduct={setEditProduct} isSuperUser={isSuperUser}/>
            }
        </div>
    )
}

export default Products
