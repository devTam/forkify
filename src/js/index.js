// Global app controller
import Search from './models/Search';
import Recipe from './models/recipe';
import List from './models/List';
import Likes from './models/Likes';
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import {elements, renderLoader, clearLoader} from './views/base';
/** Global state of the app
 * - Search object
 * - Current recipe object
 * - Shopping list object
 * - Liked recipes
 */
const state = {};


/**
 * SEARCH CONTROLLER
 */
const controlSearch = async () => {
    // 1. Get the query from the view
    const query = searchView.getInput();

    if(query) {
        //2. New search object and add to state
        state.search = new Search(query);

        //3. prepare UI for results
        searchView.clearInput();//clear the input field
        searchView.clearResults();//clear the results
        renderLoader(elements.searchRes);

        try {
            //4. Search for recipes
            await state.search.getResults();
    
            //5. Render results on UI
            clearLoader();
            searchView.renderResults(state.search.result);            
        } catch(error) {
            alert('something went wrong with the search!');
            clearLoader();
        }
    }


};

elements.searchForm.addEventListener('submit', e => {
    e.preventDefault(); // To prevent the page from reloading each time the form is submitted
    controlSearch();
});

elements.searchResPages.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');
    if(btn) {
        const goToPage = parseInt(btn.dataset.goto, 10);// reads the data-goto attribute added to the html
        searchView.clearResults();
        searchView.renderResults(state.search.result, goToPage);
    }
})


/**
 * RECIPE CONTROLLER
 */
const controlRecipe = async() => {
    // get the id from the url
    const id = window.location.hash.replace('#', '');

    if(id) {
        // prepare the UI for changes
        renderLoader(elements.recipe);

        // Highlight selected search item
        if(state.search) searchView.highlightSelected(id);

        // create a new recipe object
        state.recipe = new Recipe(id);

        try {
            // get recipe data and parse ingredients
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();

            // calculate servings and time
            state.recipe.calcTime();
            state.recipe.calcServings();
    
            // render the recipe
            clearLoader();
            recipeView.renderRecipe(
                state.recipe,
                state.likes.isLiked(id)
            );


        } catch(error) {
            alert('Error processing recipe');
        }
    }
};

// window.addEventListener('hashchange', controlRecipe);
// window.addEventListener('load', controlRecipe);

['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));

// LIST CONTROLLER
const controlList = () => {
    //create a new list if there is none yet
    if(!state.list) state.list = new List();

    //Add each ingredient to the list and UI
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    });

}

// Handle delete and update list item events
elements.shopping.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.itemid;

    // Handle the delete button
    if(e.target.matches('.shopping__delete, .shopping__delete *')) {
        // Delete from state
        state.list.deleteItem(id);

        //Delete from UI
        listView.deleteItem(id);

        //Handle the count update
    }else if(e.target.matches('.shopping__count--value')) {
        const val = pardeFloat(e.target.value);
        state.list.updateCount(id, val);
    }
});


//LIKE CONTROLLER


const controlLike = () => {
    if(!state.likes) state.likes = new Likes();
    const currentID = state.recipe.id;
    //User has not yet liked current recipe
    if(!state.likes.isLiked(currentID)) {
        //Add like to the state
        const newLike = state.likes.addLike(
            currentID,
            state.recipe.title,
            state.recipe.author,
            state.recipe.img
            )
        //Toggle the like button
            likesView.toggleLikeBtn(true);
        //Add like to UI list
        likesView.renderLike(newLike);
        
        //User has liked current recipe
    }else {
        //Remove like from the state
        state.likes.deleteLike(currentID);

        //Toggle the like button
        likesView.toggleLikeBtn(false);
        
        //Remove like from UI list
        likesView.deleteLike(currentID);

    }
    likesView.toggleLikeMenu(state.likes.getNumLikes());
};

// Restore like recipes on page load
window.addEventListener('load', () => {
    state.likes = new Likes();

    //Restore like from local storage
    state.likes.readStorage();

    // Toggle like menu button
    likesView.toggleLikeMenu(state.likes.getNumLikes());

    // Render the existing likes
    state.likes.likes.forEach( like => likesView.renderLike(like));
});


// Handling recipe button clicks
elements.recipe.addEventListener('click', e => {
    if(e.target.matches('.btn-decrease, .btn-decrease *')) {
        // Decrease button is clicked
        if(state.recipe.servings > 1) {
            state.recipe.updateServings('dec');
            recipeView.updateServingsIngredients(state.recipe);
        }
    }else if(e.target.matches('.btn-increase, .btn-increase *')) {
        // Increase button is clicked
        state.recipe.updateServings('inc');
        recipeView.updateServingsIngredients(state.recipe);
    } else if(e.target.matches('.recipe__btn--add, .recipe__btn--add *')) {
        // Add ingredients to shopping list
        controlList();
    }else if(e.target.matches('.recipe__love, .recipe__love *')) {
        controlLike();
    }
});
