import React, { useState } from 'react';
import { BsCheck, BsX } from "react-icons/bs";

import { auth } from "../firebase/config";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from "firebase/auth";
import { error as logError } from "../utils/logger";

import "../css/modal.css";

const Password = ({ showPassword, setShowPassword }) => {

    const [data, setData] = useState({
        actualPass: '',
        password: '',
        confirmPass: '',
        errorMsj: '',
        changePass: false
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        setData(prev => ({ ...prev, errorMsj: '' }));

        if (data.password !== data.confirmPass) {
            setData(prev => ({
                ...prev,
                errorMsj: 'Las contraseñas no coinciden.'
            }));
            return;
        }

        try {
            const user = auth.currentUser;

            if (!user) {
                setData(prev => ({
                    ...prev,
                    errorMsj: 'No hay usuario autenticado.'
                }));
                return;
            }

            // Reautenticación
            const credential = EmailAuthProvider.credential(
                user.email,
                data.actualPass
            );

            await reauthenticateWithCredential(user, credential);

            // Cambiar contraseña
            await updatePassword(user, data.password);

            setData(prev => ({
                ...prev,
                changePass: true,
                errorMsj: ''
            }));

        } catch (error) {
            logError("Password", error);

            if (error.code === "auth/wrong-password") {
                setData(prev => ({
                    ...prev,
                    errorMsj: 'La contraseña actual no coincide.'
                }));
            } 
            else if (error.code === "auth/weak-password") {
                setData(prev => ({
                    ...prev,
                    errorMsj: 'La nueva contraseña debe tener al menos 6 caracteres.'
                }));
            } 
            else {
                setData(prev => ({
                    ...prev,
                    errorMsj: error.message
                }));
            }
        }
    };

    const handleChange = (e) => {
        setData({
            ...data,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="modalContainer" style={showPassword ? { display: 'flex' } : { display: 'none' }}>

            {
                data.changePass ? (
                    <div className="modalBody">
                        <h2>La contraseña fue actualizada correctamente.</h2>

                        <div className="container-button">
                            <button onClick={() => setShowPassword(false)}>
                                <BsCheck size={22} style={{ marginRight: 5 }} />
                                <b>Aceptar</b>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="modalBody">

                        <h2>
                            Cambia tu contraseña
                        </h2>

                        <form onSubmit={handleSubmit} style={{ width: '90%' }}>

                            <div className="form-group">
                                <label>Contraseña actual</label>
                                <input
                                    type="password"
                                    name="actualPass"
                                    value={data.actualPass}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Nueva contraseña</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={data.password}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Confirmar contraseña</label>
                                <input
                                    type="password"
                                    name="confirmPass"
                                    value={data.confirmPass}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            {data.errorMsj && (
                                <p className="msj-error">{data.errorMsj}</p>
                            )}

                            <div className="container-button">

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(false)}
                                    style={{ backgroundColor: 'red' }}
                                >
                                    <BsX size={22} style={{ marginRight: 5 }} color="#FFFFFF" />
                                    <b>Cancelar</b>
                                </button>

                                <button type="submit">
                                    <BsCheck size={22} style={{ marginRight: 5 }} />
                                    <b>Actualizar contraseña</b>
                                </button>

                            </div>

                        </form>
                    </div>
                )
            }
        </div>
    );
};

export default Password;