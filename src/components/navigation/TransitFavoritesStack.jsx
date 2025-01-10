import { createNativeStackNavigator } from "@react-navigation/native-stack";

import TransitHomeScreen from '../screens/TransitHomeScreen';
import TransitItem from '../screens/TransitItem';

const FavoritesStack = createNativeStackNavigator();

function TransitFavoritesStack() {
    return (
        <FavoritesStack.Navigator>
            <FavoritesStack.Screen name="Home" component={TransitHomeScreen} />
            <FavoritesStack.Screen name="Transit Item" component={TransitItem} />
        </FavoritesStack.Navigator>
    );
}

export default TransitFavoritesStack;