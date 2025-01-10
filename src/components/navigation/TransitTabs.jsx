import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import TransitFavoritesStack from './TransitFavoritesStack';
import TransitTrainScreen from '../screens/TransitTrainScreen';
import TransitBusScreen from "../screens/TransitBusScreen";
import { FavoriteBussesContext, FavoriteTrainsContext } from "../../FavoritesContext";

const BottomTabs = createBottomTabNavigator();

function TransitTabs(props) {
    // Define state for favorite trains and buses
    const [favoriteTrains, setFavoriteTrains] = useState([]);
    const [favoriteBusses, setFavoriteBusses] = useState([]);

    return (
        <FavoriteTrainsContext.Provider value={[favoriteTrains, setFavoriteTrains]}>
            <FavoriteBussesContext.Provider value={[favoriteBusses, setFavoriteBusses]}>
                <BottomTabs.Navigator>
                    <BottomTabs.Screen name="Favorites" component={TransitFavoritesStack} />
                    <BottomTabs.Screen name="Trains" component={TransitTrainScreen} />
                    <BottomTabs.Screen name="Busses" component={TransitBusScreen} />
                </BottomTabs.Navigator>
            </FavoriteBussesContext.Provider>
        </FavoriteTrainsContext.Provider>
    );
}

export default TransitTabs;
