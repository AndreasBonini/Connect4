import { render, screen, fireEvent, getByDisplayValue } from '@testing-library/react';
import Notice from './components/Notice.js'

const makeSut = (props) => {
    return render(<Notice onClick={jest.fn()} {...props} />);
  };

  const noticeText = "Connecting...";

describe("Notice", () => {
    test("Should render", () => {
      const {container} = render(<Notice text={"Unit Testing"} />);

        const notice = container.querySelector('.notice');
    
        expect(notice).toBeInTheDocument();
      });

      /*
      test("Should call onClick successfully", () => {
        const spy = jest.fn();
    
        const { getByText } = makeSut({ onClick: spy });
    
        fireEvent.click(getByText(noticeText));
    
        expect(spy).toHaveBeenCalled();
      });

      */
});

console.log("end");